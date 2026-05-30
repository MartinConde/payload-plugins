'use client'

/* Field-picker for CSV export. Lists candidate fields with checkboxes,
   defaults to the columns currently visible in the table, then drives
   the paginated fetch + CSV download. Uses Sheet (consistent with
   BulkEditSheet) instead of a separate Dialog primitive. */

import * as React from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import { Checkbox } from 'payload-plugin-shadcn-ui'
import type { FieldMeta } from '../columns/fieldPicker.js'
import {
  coerceCellValue,
  downloadCsv,
  rowsToCsv,
} from './csvExport.js'

export type ExportScope = 'selected' | 'filtered' | 'all'

export type ExportFieldChoice = {
  id: string
  label: string
  field?: FieldMeta
}

export type FieldPickerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scope: ExportScope
  collectionSlug: string
  /** Ordered candidate fields (locked ids like `select` excluded). */
  candidates: ExportFieldChoice[]
  /** Ids initially checked. Order does not matter; checked-ids inherit `candidates` order on export. */
  initialSelectedIds: ReadonlyArray<string>
  /** Ids of currently selected rows (only used when scope === 'selected'). */
  selectedRowIds: ReadonlyArray<string | number>
  /** Soft cap for total rows exported before we ask to continue. */
  rowSoftCap?: number
}

const PAGE_SIZE = 500
const DEFAULT_SOFT_CAP = 50_000

const scopeTitle = (scope: ExportScope, selectedCount: number): string => {
  if (scope === 'selected')
    return `Export ${selectedCount} selected row${selectedCount === 1 ? '' : 's'}`
  if (scope === 'filtered') return 'Export filtered rows'
  return 'Export all rows'
}

const scopeDescription = (scope: ExportScope): string => {
  if (scope === 'selected')
    return 'Only the rows you ticked will be exported.'
  if (scope === 'filtered')
    return 'Applies the current filter, search, and sort. Pagination is ignored — all matching rows are exported.'
  return 'Exports every row in this collection, ignoring filters and search.'
}

const today = (): string => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const buildBaseParams = (
  scope: ExportScope,
  selectedRowIds: ReadonlyArray<string | number>,
): URLSearchParams => {
  if (scope === 'selected') {
    const params = new URLSearchParams()
    for (const id of selectedRowIds) {
      params.append('where[id][in][]', String(id))
    }
    return params
  }
  if (scope === 'all') return new URLSearchParams()
  // filtered: clone current URL state, drop pagination + column-visibility keys
  const params =
    typeof window === 'undefined'
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search)
  params.delete('page')
  params.delete('limit')
  params.delete('columns')
  return params
}

export function FieldPickerSheet({
  open,
  onOpenChange,
  scope,
  collectionSlug,
  candidates,
  initialSelectedIds,
  selectedRowIds,
  rowSoftCap = DEFAULT_SOFT_CAP,
}: FieldPickerSheetProps): React.ReactElement {
  const [checked, setChecked] = React.useState<Record<string, boolean>>({})
  const [exporting, setExporting] = React.useState(false)
  const [progress, setProgress] = React.useState<{
    done: number
    total: number | null
  } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const cancelledRef = React.useRef(false)

  // Seed selection whenever the sheet opens or the candidate set changes.
  React.useEffect(() => {
    if (!open) return
    const initSet = new Set(initialSelectedIds)
    const next: Record<string, boolean> = {}
    for (const c of candidates) {
      next[c.id] = initSet.has(c.id)
    }
    setChecked(next)
    setExporting(false)
    setProgress(null)
    setError(null)
    cancelledRef.current = false
  }, [open, candidates, initialSelectedIds])

  const checkedIds = React.useMemo(
    () => candidates.filter((c) => checked[c.id]).map((c) => c.id),
    [candidates, checked],
  )

  const toggleAll = (value: boolean) => {
    const next: Record<string, boolean> = {}
    for (const c of candidates) next[c.id] = value
    setChecked(next)
  }

  const handleExport = async () => {
    if (checkedIds.length === 0) return
    const pickedFields = candidates.filter((c) => checked[c.id])

    setExporting(true)
    setError(null)
    setProgress({ done: 0, total: null })
    cancelledRef.current = false

    try {
      const baseParams = buildBaseParams(scope, selectedRowIds)
      const docs: Record<string, unknown>[] = []
      let page = 1
      let total: number | null = null
      let softCapPrompted = false

      while (true) {
        if (cancelledRef.current) throw new Error('Export cancelled.')
        const params = new URLSearchParams(baseParams.toString())
        params.set('depth', '0')
        params.set('limit', String(PAGE_SIZE))
        params.set('page', String(page))

        const res = await fetch(
          `/api/${collectionSlug}?${params.toString()}`,
          { credentials: 'include' },
        )
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`)
        const body = (await res.json()) as {
          docs?: Record<string, unknown>[]
          totalDocs?: number
          hasNextPage?: boolean
        }
        const pageDocs = body.docs ?? []
        docs.push(...pageDocs)
        total = typeof body.totalDocs === 'number' ? body.totalDocs : null
        setProgress({ done: docs.length, total })

        if (!body.hasNextPage) break

        if (!softCapPrompted && docs.length >= rowSoftCap) {
          softCapPrompted = true
          const proceed = window.confirm(
            `Already exported ${docs.length} rows. Continue?`,
          )
          if (!proceed) break
        }

        page += 1
      }

      const headers = pickedFields.map((f) => f.label)
      const rows = docs.map((doc) =>
        pickedFields.map((f) => coerceCellValue(f.field, doc[f.id])),
      )
      const csv = rowsToCsv(headers, rows)
      downloadCsv(`${collectionSlug}-${scope}-${today()}.csv`, csv)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const allChecked = checkedIds.length === candidates.length
  const noneChecked = checkedIds.length === 0

  return (
    <Sheet open={open} onOpenChange={(next) => {
      if (!next && exporting) {
        // Allow closing to cancel an in-flight export.
        cancelledRef.current = true
      }
      onOpenChange(next)
    }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{scopeTitle(scope, selectedRowIds.length)}</SheetTitle>
          <SheetDescription>{scopeDescription(scope)}</SheetDescription>
        </SheetHeader>

        {error ? (
          <div className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {checkedIds.length} of {candidates.length} fields
          </span>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
            onClick={() => toggleAll(!allChecked)}
            disabled={exporting}
          >
            {allChecked ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No exportable fields available on this collection.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {candidates.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 hover:bg-muted/60"
                >
                  <Checkbox
                    checked={Boolean(checked[c.id])}
                    onCheckedChange={(value) =>
                      setChecked((prev) => ({
                        ...prev,
                        [c.id]: value === true,
                      }))
                    }
                    disabled={exporting}
                  />
                  <span className="text-sm">{c.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {c.id}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="flex-col items-stretch gap-2 border-t sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {progress
              ? progress.total !== null
                ? `Exported ${progress.done} / ${progress.total} rows…`
                : `Exported ${progress.done} rows…`
              : ' '}
          </span>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={exporting || noneChecked}
              onClick={handleExport}
            >
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

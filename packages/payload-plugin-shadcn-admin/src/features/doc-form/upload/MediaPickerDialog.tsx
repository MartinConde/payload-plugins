'use client'

/* Visual media-library picker for type:'upload' fields.

   Replaces the filename-only RelationshipPicker dropdown with a
   "Choose from library" button that opens a Dialog containing a
   searchable, paginated thumbnail grid of the target upload collection.

   Props contract is identical to RelationshipPicker (string | string[] | null
   value; same onChange shape) so it drops into UploadFieldInput's handlePick
   wiring without changes to the field's poly/hasMany merge logic.

   - Single (multi: false) — clicking a tile selects it and closes the dialog.
   - Multi  (multi: true)  — tiles toggle into a local selection set (pre-seeded
     from the incoming value); a footer Confirm button commits the full new
     selection. Cancel discards local changes. */

import * as React from 'react'
import {
  CheckIcon,
  FolderOpenIcon,
  UploadIcon,
} from 'lucide-react'
import { useTranslation } from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Button } from 'payload-plugin-shadcn-ui'
import { Skeleton } from 'payload-plugin-shadcn-ui'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import { cn, useActiveLocale } from 'payload-plugin-shadcn-ui'

const LIMIT = 24

type MediaDoc = {
  id: string
  url: string | null
  thumbnailURL: string | null
  filename: string | null
  mimeType: string | null
}

export type MediaPickerDialogProps = {
  relatedSlug: string
  /** The collection's useAsTitle field (typically 'filename'). When absent,
   *  the search input is rendered but has no effect on the query. */
  useAsTitle: string | undefined
  /** true → multi-select with confirm footer; false → click-to-select-and-close. */
  multi: boolean
  /** Current field value. For multi mode, pass the full selection array so
   *  the dialog can pre-mark already-selected tiles. */
  value: string | string[] | null
  onChange: (value: string | string[] | null) => void
  disabled?: boolean
  /** Optional override for the trigger button label. When omitted the default
   *  is "Choose from library" (single without selection) / "Change…" (single
   *  with an existing selection). Gallery uses "Add from library". */
  triggerLabel?: string
}

export function MediaPickerDialog({
  relatedSlug,
  useAsTitle,
  multi,
  value,
  onChange,
  disabled,
  triggerLabel,
}: MediaPickerDialogProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()

  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [docs, setDocs] = React.useState<MediaDoc[]>([])
  const [loading, setLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(false)
  const [page, setPage] = React.useState(1)
  // For multi mode: local copy of the selection, committed on Confirm only.
  const [localSelection, setLocalSelection] = React.useState<string[]>([])
  // Tracks whether the upcoming fetch is a load-more (append) vs. a new
  // search/open (replace). A ref avoids adding this flag to the effect deps.
  const appendRef = React.useRef(false)

  const activeLocale = useActiveLocale()

  // Normalise incoming value to an array of string IDs.
  const selectedIds = React.useMemo<string[]>(() => {
    if (value === null || value === undefined) return []
    if (Array.isArray(value)) return value.map(String)
    return [String(value)]
  }, [value])

  // Reset dialog state on open; snapshot the current selection for multi mode.
  React.useEffect(() => {
    if (!open) return
    appendRef.current = false
    setSearch('')
    setPage(1)
    setDocs([])
    setHasMore(false)
    if (multi) setLocalSelection(selectedIds.slice())
    // Intentionally omits selectedIds: snapshot the selection at open-time only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, multi])

  // Fetch — fires on open, search, page, slug, or locale change.
  // `appendRef.current` at the moment the effect runs decides append vs. replace.
  React.useEffect(() => {
    if (!open) return

    const isAppend = appendRef.current
    appendRef.current = false

    let cancelled = false
    setLoading(true)

    // Debounce search changes (200 ms); load-more fires immediately.
    const delay = isAppend ? 0 : 200
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams()
          if (search.trim().length > 0 && useAsTitle) {
            params.set(`where[${useAsTitle}][like]`, search.trim())
          }
          params.set('limit', String(LIMIT))
          params.set('page', String(page))
          params.set('depth', '0')
          params.set('draft', 'true')
          if (activeLocale) params.set('locale', activeLocale)

          const res = await fetch(
            `/api/${relatedSlug}?${params.toString()}`,
            { credentials: 'include' },
          )
          if (!res.ok || cancelled) return
          const body = (await res.json()) as {
            docs?: any[]
            totalPages?: number
            page?: number
          }
          if (cancelled) return

          const newDocs: MediaDoc[] = (body.docs ?? []).map((d: any) => ({
            id: String(d.id),
            url: typeof d.url === 'string' ? d.url : null,
            thumbnailURL:
              typeof d.thumbnailURL === 'string' ? d.thumbnailURL : null,
            filename: typeof d.filename === 'string' ? d.filename : null,
            mimeType: typeof d.mimeType === 'string' ? d.mimeType : null,
          }))

          if (isAppend) {
            setDocs((prev) => [...prev, ...newDocs])
          } else {
            setDocs(newDocs)
          }
          setHasMore((body.totalPages ?? 1) > (body.page ?? page))
        } catch {
          if (!cancelled && !isAppend) setDocs([])
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, delay)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, search, page, relatedSlug, useAsTitle, activeLocale])

  // ── event handlers ────────────────────────────────────────────────────────

  const handleTileClick = (id: string) => {
    if (!multi) {
      onChange(id)
      setOpen(false)
      return
    }
    setLocalSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleConfirm = () => {
    onChange(localSelection.length > 0 ? localSelection : null)
    setOpen(false)
  }

  const handleLoadMore = () => {
    appendRef.current = true
    setPage((p) => p + 1)
  }

  const handleSearchChange = (term: string) => {
    // Search change resets pagination (not a load-more append).
    appendRef.current = false
    setPage(1)
    setSearch(term)
  }

  const hasSelection = selectedIds.length > 0

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <FolderOpenIcon className="size-3.5" />
        <span className="ml-1">
          {triggerLabel != null
            ? triggerLabel
            : !multi && hasSelection
              ? t('shadcnAdmin:pickerChange')
              : t('shadcnAdmin:chooseFromLibrary')}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t('shadcnAdmin:mediaLibrary')}</DialogTitle>
          </DialogHeader>

          {/* Scrollable grid area */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mb-4">
              <Input
                placeholder={t('shadcnAdmin:searchPlaceholder')}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {loading && docs.length === 0 ? (
              /* Skeleton tiles while the first page loads */
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: LIMIT }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="aspect-square rounded-md"
                  />
                ))}
              </div>
            ) : docs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t('general:noResultsFound')}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {docs.map((doc) => {
                    const isSelected = multi
                      ? localSelection.includes(doc.id)
                      : selectedIds.includes(doc.id)
                    const isImg = doc.mimeType?.startsWith('image/')
                    const src = doc.thumbnailURL ?? doc.url ?? null

                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleTileClick(doc.id)}
                        className={cn(
                          'group relative overflow-hidden rounded-md border bg-card text-left transition-colors',
                          'hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected && 'border-primary ring-2 ring-primary',
                        )}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-square overflow-hidden bg-muted">
                          {isImg && src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={src}
                              alt={doc.filename ?? ''}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <UploadIcon className="size-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Filename + mime */}
                        <div className="p-2">
                          <p className="truncate text-xs font-medium">
                            {doc.filename ?? doc.id}
                          </p>
                          {doc.mimeType ? (
                            <p className="truncate text-[10px] text-muted-foreground">
                              {doc.mimeType}
                            </p>
                          ) : null}
                        </div>

                        {/* Selection badge */}
                        {isSelected ? (
                          <div className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <CheckIcon className="size-3" />
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>

                {hasMore ? (
                  <div className="mt-4 flex justify-center pb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={handleLoadMore}
                    >
                      {loading ? '…' : t('shadcnAdmin:loadMore')}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* Multi-select footer */}
          {multi ? (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t('general:cancel')}
              </Button>
              <Button type="button" onClick={handleConfirm}>
                {localSelection.length > 0
                  ? t('shadcnAdmin:selectCount', {
                      count: localSelection.length,
                    })
                  : t('general:select')}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

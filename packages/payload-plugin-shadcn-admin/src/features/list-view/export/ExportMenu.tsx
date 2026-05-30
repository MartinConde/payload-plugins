'use client'

/* "Export ▾" dropdown rendered in the DataTable toolbar next to View
   options. Three scopes: selected (disabled when no rows are selected),
   filtered (current URL state), all. Each item opens a field-picker
   sheet that drives the paginated CSV download. */

import * as React from 'react'
import { Download } from 'lucide-react'
import type { Table as TanstackTable } from '@tanstack/react-table'
import { useTranslation } from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Button } from 'payload-plugin-shadcn-ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'payload-plugin-shadcn-ui'
import type { FieldMeta } from '../columns/fieldPicker.js'
import {
  FieldPickerSheet,
  type ExportFieldChoice,
  type ExportScope,
} from './FieldPickerSheet.js'

const LOCKED_COLUMN_IDS = new Set(['select'])

export type ExportMenuProps<TData extends { id: number | string }> = {
  table: TanstackTable<TData>
  collectionSlug: string
  /** Serializable field metadata from the consumer collection. When
   *  present, used as the source of truth for candidate fields and
   *  labels. When absent, falls back to the table's leaf columns. */
  fields?: ReadonlyArray<FieldMeta>
}

const labelFor = (field: FieldMeta): string => {
  const label = typeof field.label === 'string' ? field.label : undefined
  return label && label.length > 0 ? label : field.name ?? ''
}

export function ExportMenu<TData extends { id: number | string }>({
  table,
  collectionSlug,
  fields,
}: ExportMenuProps<TData>): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const [open, setOpen] = React.useState(false)
  const [scope, setScope] = React.useState<ExportScope>('filtered')

  const selectedRows = table.getSelectedRowModel().rows
  const selectedRowIds = React.useMemo(
    () => selectedRows.map((r) => r.original.id),
    [selectedRows],
  )

  /* Candidate fields, in the user's current column order (drag-reorder
     preserved). Labels and field metadata come from `fields` when
     present so polymorphic / complex serialization downstream can
     consult the original field config. Falls back to the column id
     for synthetic columns that have no Payload field entry. */
  const candidates = React.useMemo<ExportFieldChoice[]>(() => {
    const fieldByName = new Map<string, FieldMeta>()
    if (fields) {
      for (const f of fields) {
        if (!f.name) continue
        fieldByName.set(f.name, f)
      }
    }
    return table
      .getAllLeafColumns()
      .filter((col) => !LOCKED_COLUMN_IDS.has(col.id))
      .map((col) => {
        const field = fieldByName.get(col.id)
        return {
          id: col.id,
          label: field ? labelFor(field) : col.id,
          field,
        }
      })
  }, [fields, table])

  /* Default-checked = columns currently visible in the table, honoring
     the user's column order. */
  const initialSelectedIds = React.useMemo(() => {
    const candidateIds = new Set(candidates.map((c) => c.id))
    return table
      .getVisibleLeafColumns()
      .map((col) => col.id)
      .filter((id) => !LOCKED_COLUMN_IDS.has(id) && candidateIds.has(id))
  }, [candidates, table])

  const openWithScope = (next: ExportScope) => {
    setScope(next)
    setOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="mr-2 h-4 w-4" />
            {t('general:export')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={selectedRowIds.length === 0}
            onSelect={() => openWithScope('selected')}
          >
            {t('shadcnAdmin:exportSelected')}
            {selectedRowIds.length > 0 ? ` (${selectedRowIds.length})` : ''}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openWithScope('filtered')}>
            {t('shadcnAdmin:exportFiltered')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openWithScope('all')}>
            {t('shadcnAdmin:exportAll')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FieldPickerSheet
        open={open}
        onOpenChange={setOpen}
        scope={scope}
        collectionSlug={collectionSlug}
        candidates={candidates}
        initialSelectedIds={initialSelectedIds}
        selectedRowIds={selectedRowIds}
      />
    </>
  )
}

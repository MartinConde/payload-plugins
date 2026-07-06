'use client'

import type { CellContext, ColumnDef } from '@tanstack/react-table'
import * as React from 'react'

import { DataTableColumnHeader } from '../data-table/DataTableColumnHeader.js'
import {
  findFieldByName,
  pickFieldNames,
  type CollectionMeta,
  type FieldMeta,
} from './fieldPicker.js'
import { labelFor } from './cellFormatters.js'
import { renderCellForField } from './renderCellForField.js'

/* The auto-columns builder reads only a small structural subset of Payload's
   SanitizedCollectionConfig so callers don't need to import Payload's full type
   into a 'use client' module. Payload's real (stricter) types remain assignable. */
export type AutoField = FieldMeta & {
  options?: ReadonlyArray<
    string | { label?: unknown; value: string | number }
  >
  /** array-field labels — used by the auto cell to render
   *  "{N} {singular|plural}" when set. */
  labels?: { singular?: string | null; plural?: string | null } | null
  admin?: {
    hidden?: boolean
    disableListColumn?: boolean
    date?: { displayFormat?: string }
    [k: string]: unknown
  } | null
  custom?: Record<string, any> | null
}

export type AutoCollection = CollectionMeta & {
  fields: ReadonlyArray<AutoField>
}

const PLUGIN_NAMESPACE = 'plugin-shadcn-admin'

const SORTABLE_TYPES = new Set([
  'text',
  'textarea',
  'email',
  'number',
  'date',
  'checkbox',
  'radio',
  'select',
])

const isSortable = (field: AutoField): boolean => {
  if (field.hasMany) return false
  return SORTABLE_TYPES.has(field.type)
}

/* Synthetic "fields" for id / createdAt / updatedAt — Payload doesn't list
   these in collection.fields but they're always present on the row. */
const SYNTHETIC_FIELDS: Record<string, AutoField> = {
  id: { type: 'text', name: 'id', label: 'ID' },
  createdAt: { type: 'date', name: 'createdAt', label: 'Created' },
  updatedAt: { type: 'date', name: 'updatedAt', label: 'Updated' },
}

const isExcluded = (field: AutoField): boolean =>
  Boolean(field.hidden || field.admin?.hidden || field.admin?.disableListColumn)

const findField = (
  collection: AutoCollection,
  name: string,
): AutoField | undefined => {
  if (SYNTHETIC_FIELDS[name]) return SYNTHETIC_FIELDS[name]
  return findFieldByName(collection.fields, name)
}

export type BuildColumnsOptions = {
  collection: AutoCollection
  /** Map of related-collection slug → its useAsTitle, used by relationship
   *  cells to render the related doc's title. Passed as a plain object so it
   *  survives RSC→Client serialization. */
  useAsTitleBySlug?: Record<string, string | undefined>
  /** v3.20 — column field names that carry a native `admin.components.Cell`.
   *  Their cells are pre-rendered server-side (see `renderNativeCells`). */
  nativeCellFieldNames?: ReadonlyArray<string>
  /** v3.20 — `[rowId][fieldName]` → server-rendered native cell node. */
  nativeCellsByRow?: Record<string, Record<string, React.ReactNode>>
}

export function buildColumnsForCollection({
  collection,
  useAsTitleBySlug,
  nativeCellFieldNames,
  nativeCellsByRow,
}: BuildColumnsOptions): ColumnDef<any, any>[] {
  const useAsTitle = collection.admin?.useAsTitle
  const names = pickFieldNames(collection)
  const columns: ColumnDef<any, any>[] = []

  for (const name of names) {
    const field = findField(collection, name)
    if (!field) continue
    if (isExcluded(field)) continue

    const title = labelFor(field, name)
    const sortable = isSortable(field)

    // Cell resolution order (v3.20): (1) plugin escape hatch
    // `field.custom['plugin-shadcn-admin'].cell` — a client-ref function, takes
    // priority and is the recommended path for context-dependent Cells; (2) a
    // Payload-native `field.admin.components.Cell`, pre-rendered server-side and
    // looked up per row from `nativeCellsByRow`; (3) the built-in renderer.
    const override = field.custom?.[PLUGIN_NAMESPACE]?.cell as
      | ColumnDef<any, any>['cell']
      | undefined

    const hasNativeCell = Boolean(
      !override && nativeCellFieldNames?.includes(name),
    )

    const fallbackCell = (ctx: CellContext<any, unknown>) =>
      renderCellForField(field, ctx.getValue(), {
        isUseAsTitle: name === useAsTitle,
        useAsTitleBySlug,
      })

    const cell =
      override ??
      (hasNativeCell
        ? (ctx: CellContext<any, unknown>) => {
            const rowId = (ctx.row.original as { id?: unknown })?.id
            const node = nativeCellsByRow?.[String(rowId)]?.[name]
            // Fall back if a row has no pre-rendered node (e.g. id missing).
            return node !== undefined ? node : fallbackCell(ctx)
          }
        : fallbackCell)

    columns.push({
      accessorKey: name,
      header: sortable
        ? ({ column }) => (
            <DataTableColumnHeader column={column} title={title} />
          )
        : () => <span className="text-xs font-medium">{title}</span>,
      cell,
      enableSorting: sortable,
    })
  }

  return columns
}


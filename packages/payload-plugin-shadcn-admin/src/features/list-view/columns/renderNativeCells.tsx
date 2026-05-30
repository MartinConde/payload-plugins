/* v3.20 — native `field.admin.components.Cell` interop.

   Payload-native Cell components are referenced in the collection config as a
   `PayloadComponent` (a path string / `{path, exportName}`) under
   `field.admin.components.Cell`, and resolved through the import map at render
   time. Our `.cell` escape hatch (§7b) is plugin-namespaced and lives in
   `field.custom` instead — it never touches the import map. This helper closes
   the native gap by pre-rendering each native Cell SERVER-SIDE via Payload's own
   `RenderServerComponent` (the same call site as `@payloadcms/ui`'s
   `renderCell`), so both client AND server Cells resolve, and Payload hands the
   component the canonical `DefaultCell{,Server}ComponentProps`.

   The rendered ReactNodes are returned as `{ [rowId]: { [fieldName]: node } }`
   and threaded to the client column builder, where the TanStack cell does a
   single `[rowId]?.[fieldName]` lookup instead of calling the built-in renderer.

   LIMITATION (documented in SETUP §7b): a native Cell that calls Payload's
   list-view client hooks (`useTableCell` / `useListQuery` / `useListInfo`) will
   throw at hydration — those hooks need providers we don't mount. Such Cells
   should use the `.cell` escape hatch instead. We deliberately do NOT recreate
   Payload's `ListProvider` tree (separate, much larger lift). */

import type { ReactNode } from 'react'
import type { ListViewServerProps } from '../../../internal/payloadAdapter.js'
import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent'

import type { ExtractedField } from 'payload-plugin-shadcn-ui'

type RawField = {
  name?: string
  type?: string
  admin?: { components?: { Cell?: unknown } | null } | null
}

type RawCollection = {
  fields?: ReadonlyArray<RawField>
  [k: string]: unknown
}

export type NativeCells = {
  /** Top-level column field names that carry a native `admin.components.Cell`. */
  fieldNames: string[]
  /** `[rowId][fieldName]` → server-rendered cell node. */
  byRow: Record<string, Record<string, ReactNode>>
}

export function renderNativeCells({
  collection,
  extractedFields,
  columnNames,
  docs,
  payload,
  i18n,
  collectionSlug,
  viewType,
}: {
  /** The RAW (un-extracted) collection config — carries `admin.components`. */
  collection: RawCollection
  /** The serializable extracted fields, used as the client-safe `field` prop. */
  extractedFields: ReadonlyArray<ExtractedField>
  /** Names selected as columns (so we only render cells that are shown). */
  columnNames: ReadonlyArray<string>
  docs: ReadonlyArray<{ id: number | string; [k: string]: unknown }>
  payload: ListViewServerProps['payload']
  i18n: ListViewServerProps['i18n']
  collectionSlug: string
  viewType: ListViewServerProps['viewType']
}): NativeCells {
  const rawByName = new Map<string, RawField>()
  for (const f of collection.fields ?? []) {
    if (f?.name) rawByName.set(f.name, f)
  }
  const extractedByName = new Map<string, ExtractedField>()
  for (const f of extractedFields) {
    if (f?.name) extractedByName.set(f.name, f)
  }

  // Resolve the column fields that actually carry a native Cell reference.
  const nativeFields: Array<{ name: string; raw: RawField }> = []
  for (const name of columnNames) {
    const raw = rawByName.get(name)
    if (raw?.admin?.components?.Cell) nativeFields.push({ name, raw })
  }

  if (nativeFields.length === 0) return { fieldNames: [], byRow: {} }

  const byRow: Record<string, Record<string, ReactNode>> = {}
  for (let rowIndex = 0; rowIndex < docs.length; rowIndex++) {
    const doc = docs[rowIndex]
    const rowKey = String(doc.id)
    const rowCells: Record<string, ReactNode> = {}
    for (let columnIndex = 0; columnIndex < nativeFields.length; columnIndex++) {
      const { name, raw } = nativeFields[columnIndex]
      const cellData = doc[name]
      // Mirror @payloadcms/ui's `renderCell` prop split: clientProps go to
      // client Cells (must serialize — `field` is our client-safe extracted
      // shape, `rowData` is JSON doc data), serverProps go to server Cells
      // (server-only; the raw field + payload + i18n are fine here). We do not
      // link cells or wire onClick — the row itself is the link in our table.
      const clientField = extractedByName.get(name) ?? { name, type: raw.type }
      const clientProps = {
        cellData,
        collectionSlug,
        field: clientField,
        link: false,
        rowData: doc,
        viewType,
      }
      const serverProps = {
        cellData,
        collectionConfig: payload.collections?.[collectionSlug]?.config,
        collectionSlug,
        columnIndex,
        field: raw,
        i18n,
        link: false,
        payload,
        rowData: doc,
      }
      rowCells[name] = RenderServerComponent({
        clientProps,
        Component: raw.admin!.components!.Cell as never,
        importMap: payload.importMap,
        serverProps,
        key: `${rowKey}-${name}`,
      })
    }
    byRow[rowKey] = rowCells
  }

  return { fieldNames: nativeFields.map((f) => f.name), byRow }
}

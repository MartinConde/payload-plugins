'use client'

import type { ColumnDef, Table as TanstackTable } from '@tanstack/react-table'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'

import { CollectionListViewClient } from './CollectionListViewClient.js'
import { selectColumn } from './data-table/selectColumn.js'
import { FilterBar } from './filters/FilterBar.js'
import { BulkEditSheet } from './bulk/BulkEditSheet.js'
import { TrashBulkActions } from './bulk/TrashBulkActions.js'
import { Button } from 'payload-plugin-shadcn-ui'
import {
  buildColumnsForCollection,
  type BuildColumnsOptions,
} from './columns/autoColumns.js'
import type { FieldMeta } from './columns/fieldPicker.js'

type Row = { id: number | string }

/* Bridges an RSC (AutoCollectionListView) and the client-side DataTable.
   buildColumnsForCollection lives in a 'use client' module, so the RSC can't
   call it directly — it renders this component instead, and we invoke the
   builder on the client where the resulting cell functions are valid client
   references. The `collection` and `useAsTitleBySlug` props must be the
   serializable subsets extracted in the RSC. */
type AutoColumnsBridgeProps = BuildColumnsOptions &
  Omit<
    React.ComponentProps<typeof CollectionListViewClient>,
    'columns'
  > & {
    /** Trash mode (viewType === 'trash'): swaps the default edit+delete bulk
     *  actions for restore + permanent-delete. Drives the trash branches in
     *  CollectionListViewClient too (forwarded via `isTrash`). */
    hasTrashPermission?: boolean
  }

export function AutoColumnsBridge({
  collection,
  useAsTitleBySlug,
  hasTrashPermission,
  nativeCellFieldNames,
  nativeCellsByRow,
  ...clientProps
}: AutoColumnsBridgeProps) {
  const isTrash = Boolean(clientProps.isTrash)
  // In trash mode, selection (and thus bulk actions) should show when EITHER
  // restore or permanent-delete is permitted — not just delete.
  const showSelect = isTrash
    ? Boolean(clientProps.enableBulkDelete) || Boolean(hasTrashPermission)
    : Boolean(clientProps.enableBulkDelete)
  const columns = React.useMemo(() => {
    const auto = buildColumnsForCollection({
      collection,
      useAsTitleBySlug,
      nativeCellFieldNames,
      nativeCellsByRow,
    }) as ColumnDef<Row, any>[]
    return showSelect ? [selectColumn<Row>(), ...auto] : auto
  }, [
    collection,
    useAsTitleBySlug,
    showSelect,
    nativeCellFieldNames,
    nativeCellsByRow,
  ])

  // Inject the default bulk-action pair only when the consumer hasn't supplied
  // their own bulkActions. Consumer wins. In trash mode the pair becomes
  // restore + permanent-delete.
  const bulkActions = clientProps.bulkActions
  const collectionSlug = clientProps.collectionSlug
  const resolvedBulkActions =
    bulkActions ??
    (showSelect
      ? isTrash
        ? (table: TanstackTable<Row>) => (
            <TrashBulkActions
              table={table}
              collectionSlug={collectionSlug}
              collection={collection as any}
              canRestore={hasTrashPermission}
              canDelete={Boolean(clientProps.enableBulkDelete)}
            />
          )
        : (table: TanstackTable<Row>) => (
            <DefaultBulkActions
              table={table}
              collectionSlug={collectionSlug}
              collection={collection as any}
              useAsTitleBySlug={useAsTitleBySlug}
              trashEnabled={Boolean(clientProps.trashEnabled)}
            />
          )
      : undefined)

  return (
    <CollectionListViewClient<Row>
      {...(clientProps as React.ComponentProps<typeof CollectionListViewClient<Row>>)}
      columns={columns}
      bulkActions={resolvedBulkActions}
      exportFields={collection.fields as ReadonlyArray<FieldMeta>}
      filterBar={
        <FilterBar
          collection={collection}
          useAsTitleBySlug={useAsTitleBySlug}
        />
      }
    />
  )
}

function DefaultBulkActions({
  table,
  collectionSlug,
  collection,
  useAsTitleBySlug,
  trashEnabled,
}: {
  table: TanstackTable<Row>
  collectionSlug: string
  collection: { slug: string; fields: any[] }
  useAsTitleBySlug: Record<string, string | undefined>
  /** When the collection has `trash: true`, delete becomes a soft delete
   *  (sends docs to the trash) instead of a permanent delete — mirroring
   *  Payload's DeleteMany. */
  trashEnabled?: boolean
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.id)

  const handleDelete = async () => {
    const count = selectedIds.length
    const message = trashEnabled
      ? `Move ${count} item${count === 1 ? '' : 's'} to trash?`
      : `Delete ${count} item${count === 1 ? '' : 's'}? This cannot be undone.`
    if (!window.confirm(message)) {
      return
    }
    setDeleting(true)
    try {
      const params = new URLSearchParams()
      selectedIds.forEach((id) =>
        params.append('where[id][in][]', String(id)),
      )
      // Trash-enabled collections soft-delete via PATCH { deletedAt } so the
      // doc lands in the trash bin; otherwise hard-delete via DELETE.
      const res = trashEnabled
        ? await fetch(`/api/${collectionSlug}?${params.toString()}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deletedAt: new Date().toISOString() }),
          })
        : await fetch(`/api/${collectionSlug}?${params.toString()}`, {
            method: 'DELETE',
            credentials: 'include',
          })
      if (!res.ok) {
        throw new Error(`Delete failed (${res.status})`)
      }
      table.resetRowSelection()
      router.refresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setEditOpen(true)}
        disabled={deleting}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Edit selected
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete selected
      </Button>
      <BulkEditSheet
        collectionSlug={collectionSlug}
        collection={collection}
        selectedIds={selectedIds}
        useAsTitleBySlug={useAsTitleBySlug}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          setEditOpen(false)
          table.resetRowSelection()
          router.refresh()
        }}
      />
    </div>
  )
}

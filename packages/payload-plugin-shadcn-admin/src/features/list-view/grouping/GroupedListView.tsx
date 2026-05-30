'use client'

/* v3.22 — grouped list rendering. One barebones TanStack table per group (core
   row model only — no per-group toolbar / pagination / selection; those would
   cost a full DataTable per group). Reuses the exact auto column defs from
   `buildColumnsForCollection`, including v3.20 native cells (looked up by rowId,
   which is unique across groups). Row click navigates to the doc, same as the
   flat list. The "Group by" picker lives in the list header (GroupByMenu). */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useListDrawerContext } from '../../../internal/payloadAdapter.js'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'payload-plugin-shadcn-ui'
import { buildColumnsForCollection } from '../columns/autoColumns.js'
import type { GroupData } from './getGroupedData.js'

type Row = { id: number | string }

export type GroupedListViewProps = {
  collectionSlug: string
  collection: { slug: string; fields: any[]; admin?: any }
  useAsTitleBySlug: Record<string, string | undefined>
  nativeCellFieldNames?: ReadonlyArray<string>
  nativeCellsByRow?: Record<string, Record<string, React.ReactNode>>
  groups: GroupData[]
  groupByLabel: string
  totalGroups: number
  capped: boolean
}

export function GroupedListView({
  collectionSlug,
  collection,
  useAsTitleBySlug,
  nativeCellFieldNames,
  nativeCellsByRow,
  groups,
  groupByLabel,
  totalGroups,
  capped,
}: GroupedListViewProps): React.ReactElement {
  const router = useRouter()
  // In Payload's "select existing" drawer the grouped list must select rows
  // (fire onSelect) rather than navigate. Outside a drawer onSelect is
  // undefined (context defaults to `{}`).
  const { onSelect: drawerOnSelect } = useListDrawerContext()
  const columns = React.useMemo(
    () =>
      buildColumnsForCollection({
        collection: collection as never,
        useAsTitleBySlug,
        nativeCellFieldNames,
        nativeCellsByRow,
      }) as ColumnDef<Row, any>[],
    [collection, useAsTitleBySlug, nativeCellFieldNames, nativeCellsByRow],
  )

  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No results.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {capped ? (
        <p className="text-xs text-muted-foreground">
          Showing {groups.length} of {totalGroups} {groupByLabel} group
          {totalGroups === 1 ? '' : 's'} from a capped sample — narrow the list
          with a filter to see everything.
        </p>
      ) : null}
      {groups.map((group) => (
        <GroupSection
          key={group.key}
          group={group}
          columns={columns}
          onRowClick={(doc) => {
            if (drawerOnSelect) {
              drawerOnSelect({
                collectionSlug,
                doc,
                docID: String(doc.id),
              })
              return
            }
            router.push(`/admin/collections/${collectionSlug}/${doc.id}`)
          }}
        />
      ))}
    </div>
  )
}

function GroupSection({
  group,
  columns,
  onRowClick,
}: {
  group: GroupData
  columns: ColumnDef<Row, any>[]
  onRowClick: (doc: Row) => void
}): React.ReactElement {
  const table = useReactTable({
    data: group.rows as Row[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-baseline gap-2 text-sm font-semibold">
        <span>{group.heading}</span>
        <span className="text-xs font-normal text-muted-foreground">
          {group.count} {group.count === 1 ? 'item' : 'items'}
        </span>
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

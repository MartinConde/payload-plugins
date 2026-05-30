'use client'

/* Server-driven DataTable.
   Contract:
   - Controlled (URL-synced upstream): pagination, sorting, columnFilters, search
   - Uncontrolled (ephemeral UI state): columnVisibility, rowSelection
   List views must pass `pageCount` from the server. Pass `rowCount` to show
   "X of Y" totals. Set `pageSize` to the value used in the server query. */

import * as React from 'react'
import { SearchIcon } from 'lucide-react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type SortingState,
  type Table as TanstackTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { DataTablePagination } from './DataTablePagination.js'
import { DataTableViewOptions } from './DataTableViewOptions.js'
import { Input } from 'payload-plugin-shadcn-ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'

type SortableHandleContextValue = {
  attributes: ReturnType<typeof useSortable>['attributes']
  listeners: ReturnType<typeof useSortable>['listeners']
  isDragging: boolean
}

export const SortableHandleContext =
  React.createContext<SortableHandleContextValue | null>(null)

function SortableHead({
  id,
  width,
  children,
}: {
  id: string
  width: number
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  const style: React.CSSProperties = {
    width,
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  }
  const ctx = React.useMemo<SortableHandleContextValue>(
    () => ({ attributes, listeners, isDragging }),
    [attributes, listeners, isDragging],
  )
  return (
    <TableHead ref={setNodeRef} style={style}>
      <SortableHandleContext.Provider value={ctx}>
        {children}
      </SortableHandleContext.Provider>
    </TableHead>
  )
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount: number
  rowCount?: number

  // Controlled URL-synced state
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>

  // Controlled column UI state (optional — uncontrolled fallback if omitted)
  columnOrder?: ColumnOrderState
  onColumnOrderChange?: OnChangeFn<ColumnOrderState>
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>

  /** Column ids that must stay locked to the start and are not reorderable.
   *  Defaults to ['select']. */
  lockedColumnIds?: string[]

  /** Renders a "Reset columns" item at the bottom of the View dropdown. */
  onResetColumns?: () => void

  // Feature toggles
  enableSorting?: boolean
  enableFiltering?: boolean
  enableColumnVisibility?: boolean
  enableColumnReorder?: boolean
  enableRowSelection?: boolean

  // Search input (URL-synced). Renders in toolbar left when defined.
  // `searchValue` seeds the input; the input maintains its own local state for
  // fast typing and debounces upstream `onSearchChange` calls so URL writes
  // don't race with keystrokes.
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Milliseconds to wait after the last keystroke before calling `onSearchChange`. Defaults to 300. */
  searchDebounceMs?: number

  // Per-column toolbar filter input (text contains). Independent of search.
  filterColumnId?: string
  filterPlaceholder?: string

  // Toolbar slots
  toolbarLeft?: React.ReactNode
  toolbarRight?: React.ReactNode

  // Filter chip bar — rendered as its own row directly above the toolbar
  filterBar?: React.ReactNode

  // Bulk action bar — rendered above the table when row selection > 0
  bulkActions?: (table: TanstackTable<TData>) => React.ReactNode

  // Export action — rendered in the right-aligned toolbar cluster
  // between `toolbarRight` and the View options trigger.
  exportMenu?: (table: TanstackTable<TData>) => React.ReactNode

  // Row interaction
  onRowClick?: (row: Row<TData>) => void

  // Pagination footer
  showSelectedCount?: boolean

  // Empty state
  emptyMessage?: string

  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  rowCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  columnOrder,
  onColumnOrderChange,
  columnVisibility: columnVisibilityProp,
  onColumnVisibilityChange,
  lockedColumnIds = ['select'],
  onResetColumns,
  enableSorting = false,
  enableFiltering = false,
  enableColumnVisibility = false,
  enableColumnReorder = false,
  enableRowSelection = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchDebounceMs = 300,
  filterColumnId,
  filterPlaceholder = 'Filter…',
  toolbarLeft,
  toolbarRight,
  filterBar,
  bulkActions,
  exportMenu,
  onRowClick,
  showSelectedCount,
  emptyMessage = 'No results.',
  className,
}: DataTableProps<TData, TValue>) {
  const [internalVisibility, setInternalVisibility] = React.useState<VisibilityState>({})
  const columnVisibility = columnVisibilityProp ?? internalVisibility
  const handleVisibilityChange = onColumnVisibilityChange ?? setInternalVisibility
  const [rowSelection, setRowSelection] = React.useState({})
  const lockedSet = React.useMemo(
    () => new Set(lockedColumnIds),
    [lockedColumnIds],
  )

  // Local input value so typing stays instant. URL writes are debounced via
  // an effect below; external changes to `searchValue` (back/forward nav)
  // re-seed local state.
  const [localSearch, setLocalSearch] = React.useState(searchValue ?? '')
  React.useEffect(() => {
    setLocalSearch(searchValue ?? '')
  }, [searchValue])
  React.useEffect(() => {
    if (onSearchChange === undefined) return
    if (localSearch === (searchValue ?? '')) return
    const t = setTimeout(() => onSearchChange(localSearch), searchDebounceMs)
    return () => clearTimeout(t)
  }, [localSearch, searchValue, onSearchChange, searchDebounceMs])

  const table = useReactTable({
    data,
    columns,
    pageCount,
    rowCount,
    state: {
      pagination,
      ...(enableSorting && sorting ? { sorting } : {}),
      ...(enableFiltering && columnFilters ? { columnFilters } : {}),
      ...(columnOrder ? { columnOrder } : {}),
      columnVisibility,
      rowSelection,
    },
    onPaginationChange,
    ...(enableSorting && onSortingChange ? { onSortingChange } : {}),
    ...(enableFiltering && onColumnFiltersChange ? { onColumnFiltersChange } : {}),
    ...(onColumnOrderChange ? { onColumnOrderChange } : {}),
    onColumnVisibilityChange: handleVisibilityChange,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    enableSorting,
    enableFilters: enableFiltering,
    manualPagination: true,
    manualSorting: enableSorting,
    manualFiltering: enableFiltering,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => {
      const candidate = (row as { id?: string | number })?.id
      return candidate !== undefined ? String(candidate) : String(index)
    },
  })

  const sensors = useSensors(
    // distance:4 activation lets the inner sort button absorb plain clicks.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  // Stable id prevents the SSR vs client mismatch on dnd-kit's internal
  // `DndDescribedBy-N` counter, which otherwise breaks hydration and event
  // wiring (drag stops working entirely).
  const dndContextId = React.useId()

  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      if (!onColumnOrderChange) return
      const { active, over } = event
      if (!over || active.id === over.id) return
      const currentOrder = table
        .getAllLeafColumns()
        .map((c) => c.id)
      const fromId = String(active.id)
      const toId = String(over.id)
      if (lockedSet.has(fromId) || lockedSet.has(toId)) return
      const next = [...currentOrder]
      const fromIdx = next.indexOf(fromId)
      const toIdx = next.indexOf(toId)
      if (fromIdx === -1 || toIdx === -1) return
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, fromId)
      ;(onColumnOrderChange as (updater: ColumnOrderState) => void)(next)
    },
    [onColumnOrderChange, table, lockedSet],
  )

  const showSearch = onSearchChange !== undefined
  const showPerColumnFilter = enableFiltering && filterColumnId
  const showToolbar =
    showSearch ||
    showPerColumnFilter ||
    toolbarLeft ||
    toolbarRight ||
    enableColumnVisibility ||
    Boolean(exportMenu)
  const filterValue =
    showPerColumnFilter && filterColumnId
      ? (table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ''
      : ''
  const selectedCount = table.getSelectedRowModel().rows.length

  return (
    <div className={cn('space-y-4', className)}>
      {filterBar !== undefined && filterBar !== null && (
        <div data-slot="data-table-filter-bar">{filterBar}</div>
      )}
      {showToolbar && (
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative w-full max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                className="h-8 pl-8"
              />
            </div>
          )}
          {showPerColumnFilter && (
            <Input
              placeholder={filterPlaceholder}
              value={filterValue}
              onChange={(event) =>
                table.getColumn(filterColumnId!)?.setFilterValue(event.target.value)
              }
              className="h-8 max-w-sm"
            />
          )}
          {toolbarLeft}
          <div className="ml-auto flex items-center gap-2">
            {toolbarRight}
            {exportMenu ? exportMenu(table) : null}
            {enableColumnVisibility && (
              <DataTableViewOptions table={table} onReset={onResetColumns} />
            )}
          </div>
        </div>
      )}

      {bulkActions && selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {selectedCount}
            </span>
            row{selectedCount === 1 ? '' : 's'} selected
          </span>
          <div className="ml-auto flex items-center gap-2">{bulkActions(table)}</div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <DndContext
          id={dndContextId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={onDragEnd}
        >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => {
              const orderableIds = headerGroup.headers
                .map((h) => h.column.id)
                .filter((id) => !lockedSet.has(id))
              const renderHead = (header: (typeof headerGroup.headers)[number]) => {
                const content = header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())
                if (enableColumnReorder && !lockedSet.has(header.column.id)) {
                  return (
                    <SortableHead
                      key={header.id}
                      id={header.column.id}
                      width={header.getSize()}
                    >
                      {content}
                    </SortableHead>
                  )
                }
                return (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {content}
                  </TableHead>
                )
              }
              return (
                <TableRow key={headerGroup.id}>
                  {enableColumnReorder ? (
                    <SortableContext
                      items={orderableIds}
                      strategy={horizontalListSortingStrategy}
                    >
                      {headerGroup.headers.map(renderHead)}
                    </SortableContext>
                  ) : (
                    headerGroup.headers.map(renderHead)
                  )}
                </TableRow>
              )
            })}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </DndContext>
      </div>

      <DataTablePagination
        table={table}
        showSelectedCount={showSelectedCount ?? enableRowSelection}
      />
    </div>
  )
}

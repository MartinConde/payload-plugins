import * as React from 'react';
import { type ColumnDef, type ColumnFiltersState, type ColumnOrderState, type OnChangeFn, type PaginationState, type Row, type SortingState, type Table as TanstackTable, type VisibilityState } from '@tanstack/react-table';
import { useSortable } from '@dnd-kit/sortable';
type SortableHandleContextValue = {
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
    isDragging: boolean;
};
export declare const SortableHandleContext: React.Context<SortableHandleContextValue>;
type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    pageCount: number;
    rowCount?: number;
    pagination: PaginationState;
    onPaginationChange: OnChangeFn<PaginationState>;
    sorting?: SortingState;
    onSortingChange?: OnChangeFn<SortingState>;
    columnFilters?: ColumnFiltersState;
    onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
    columnOrder?: ColumnOrderState;
    onColumnOrderChange?: OnChangeFn<ColumnOrderState>;
    columnVisibility?: VisibilityState;
    onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
    /** Column ids that must stay locked to the start and are not reorderable.
     *  Defaults to ['select']. */
    lockedColumnIds?: string[];
    /** Renders a "Reset columns" item at the bottom of the View dropdown. */
    onResetColumns?: () => void;
    enableSorting?: boolean;
    enableFiltering?: boolean;
    enableColumnVisibility?: boolean;
    enableColumnReorder?: boolean;
    enableRowSelection?: boolean;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    /** Milliseconds to wait after the last keystroke before calling `onSearchChange`. Defaults to 300. */
    searchDebounceMs?: number;
    filterColumnId?: string;
    filterPlaceholder?: string;
    toolbarLeft?: React.ReactNode;
    toolbarRight?: React.ReactNode;
    filterBar?: React.ReactNode;
    bulkActions?: (table: TanstackTable<TData>) => React.ReactNode;
    exportMenu?: (table: TanstackTable<TData>) => React.ReactNode;
    onRowClick?: (row: Row<TData>) => void;
    showSelectedCount?: boolean;
    emptyMessage?: string;
    className?: string;
};
export declare function DataTable<TData, TValue>({ columns, data, pageCount, rowCount, pagination, onPaginationChange, sorting, onSortingChange, columnFilters, onColumnFiltersChange, columnOrder, onColumnOrderChange, columnVisibility: columnVisibilityProp, onColumnVisibilityChange, lockedColumnIds, onResetColumns, enableSorting, enableFiltering, enableColumnVisibility, enableColumnReorder, enableRowSelection, searchValue, onSearchChange, searchPlaceholder, searchDebounceMs, filterColumnId, filterPlaceholder, toolbarLeft, toolbarRight, filterBar, bulkActions, exportMenu, onRowClick, showSelectedCount, emptyMessage, className, }: DataTableProps<TData, TValue>): import("react/jsx-runtime").JSX.Element;
export {};

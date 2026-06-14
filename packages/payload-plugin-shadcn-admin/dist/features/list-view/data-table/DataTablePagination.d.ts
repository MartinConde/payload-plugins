import type { Table } from '@tanstack/react-table';
type DataTablePaginationProps<TData> = {
    table: Table<TData>;
    pageSizeOptions?: number[];
    showSelectedCount?: boolean;
};
export declare function DataTablePagination<TData>({ table, pageSizeOptions, showSelectedCount, }: DataTablePaginationProps<TData>): import("react/jsx-runtime").JSX.Element;
export {};

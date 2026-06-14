import type { ColumnFiltersState, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
export declare const DEFAULT_PAGE_SIZE = 10;
type UseDataTableUrlStateResult = {
    pagination: PaginationState;
    sorting: SortingState;
    columnFilters: ColumnFiltersState;
    search: string;
    onPaginationChange: OnChangeFn<PaginationState>;
    onSortingChange: OnChangeFn<SortingState>;
    onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
    onSearchChange: (value: string) => void;
};
export declare function useDataTableUrlState({ defaultPageSize, }?: {
    defaultPageSize?: number;
}): UseDataTableUrlStateResult;
export {};

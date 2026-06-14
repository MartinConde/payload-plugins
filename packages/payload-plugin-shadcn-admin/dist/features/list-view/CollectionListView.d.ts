import type { ColumnDef, Row, Table as TanstackTable } from '@tanstack/react-table';
import type { ListViewServerProps, PaginatedDocs } from '../../internal/payloadAdapter.js';
import type * as React from 'react';
import { type Crumb } from 'payload-plugin-shadcn-ui';
export type CollectionListViewProps<TData extends {
    id: number | string;
} = {
    id: number | string;
}> = {
    serverProps: ListViewServerProps;
    title: string;
    columns: ColumnDef<TData, any>[];
    /** Map a doc from PaginatedDocs.docs into the row shape your columns expect. Defaults to identity. */
    mapRow?: (doc: any) => TData;
    /** Override the breadcrumb trail. Defaults to `[{ label: title }]`. */
    breadcrumbs?: Crumb[];
    /** Override the paginated docs source. When omitted, falls back to `serverProps.data`. */
    paginatedDocs?: PaginatedDocs<{
        id: number | string;
    }>;
    /** Force search on/off. Defaults to auto: on when the collection has `admin.useAsTitle` or `admin.listSearchableFields`. */
    enableSearch?: boolean;
    searchPlaceholder?: string;
    /** Force bulk delete on/off. Defaults to `hasDeletePermission`. */
    enableBulkDelete?: boolean;
    /** Force the Create New button on/off. Defaults to `hasCreatePermission`. */
    enableCreate?: boolean;
    enableSorting?: boolean;
    enableFiltering?: boolean;
    enableColumnVisibility?: boolean;
    /** Per-column toolbar `contains` filter input. */
    filterColumnId?: string;
    filterPlaceholder?: string;
    /** Replaces the default Create New button. Must originate from a `'use client'` module. */
    toolbarRight?: React.ReactNode;
    /** Filter chip bar rendered above the toolbar. Must originate from a `'use client'` module. */
    filterBar?: React.ReactNode;
    /** Replaces the default bulk-delete action. Must originate from a `'use client'` module. */
    bulkActions?: (table: TanstackTable<TData>) => React.ReactNode;
    /** Replaces the default row click (full-page navigate to edit URL). Must originate from a `'use client'` module. */
    onRowClick?: (row: Row<TData>) => void;
    disableRowClick?: boolean;
};
export declare function CollectionListView<TData extends {
    id: number | string;
}>({ serverProps, title, columns, mapRow, breadcrumbs, paginatedDocs, enableSearch, searchPlaceholder, enableBulkDelete, enableCreate, enableSorting, enableFiltering, enableColumnVisibility, filterColumnId, filterPlaceholder, toolbarRight, filterBar, bulkActions, onRowClick, disableRowClick, }: CollectionListViewProps<TData>): import("react/jsx-runtime").JSX.Element;

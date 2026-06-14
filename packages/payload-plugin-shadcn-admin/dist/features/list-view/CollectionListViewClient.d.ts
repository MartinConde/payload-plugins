import * as React from 'react';
import type { ColumnDef, Row, Table as TanstackTable } from '@tanstack/react-table';
import type { FieldMeta } from './columns/fieldPicker.js';
export type CollectionListViewClientProps<TData extends {
    id: number | string;
}> = {
    collectionSlug: string;
    columns: ColumnDef<TData, any>[];
    data: TData[];
    pageCount: number;
    rowCount: number;
    defaultPageSize: number;
    newDocumentURL: string;
    enableSearch?: boolean;
    searchPlaceholder?: string;
    enableBulkDelete?: boolean;
    enableCreate?: boolean;
    /** Trash mode (viewType === 'trash'): row clicks open the read-only trash
     *  doc view and the empty state reads "in trash". */
    isTrash?: boolean;
    /** Collection has `trash: true`: shows a Trash entry button on the normal
     *  list toolbar (ignored in trash mode). */
    trashEnabled?: boolean;
    /** Empty-state message forwarded to the DataTable. */
    emptyMessage?: string;
    /** Render the CSV export dropdown next to View options. Defaults to true. */
    enableExport?: boolean;
    /** Serializable field metadata used to label/order the export
     *  field-picker. When omitted, the picker falls back to the table's
     *  leaf columns. Supplied by AutoColumnsBridge for the auto view. */
    exportFields?: ReadonlyArray<FieldMeta>;
    enableSorting?: boolean;
    enableFiltering?: boolean;
    enableColumnVisibility?: boolean;
    filterColumnId?: string;
    filterPlaceholder?: string;
    /** Replaces the default Create New button. */
    toolbarRight?: React.ReactNode;
    /** Filter chip bar rendered above the toolbar. Defaults to undefined → no row rendered. */
    filterBar?: React.ReactNode;
    /** Replaces the default bulk-delete action. */
    bulkActions?: (table: TanstackTable<TData>) => React.ReactNode;
    /** Replaces the default row click (full-page navigate to edit URL). */
    onRowClick?: (row: Row<TData>) => void;
    /** If true, no row click handler is installed. */
    disableRowClick?: boolean;
};
export declare function CollectionListViewClient<TData extends {
    id: number | string;
}>({ collectionSlug, columns, data, pageCount, rowCount, defaultPageSize, newDocumentURL, enableSearch, searchPlaceholder, enableBulkDelete, enableCreate, isTrash, trashEnabled, emptyMessage, enableExport, exportFields, enableSorting, enableFiltering, enableColumnVisibility, filterColumnId, filterPlaceholder, toolbarRight, filterBar, bulkActions, onRowClick, disableRowClick, }: CollectionListViewClientProps<TData>): import("react/jsx-runtime").JSX.Element;

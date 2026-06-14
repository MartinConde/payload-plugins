import type { Table as TanstackTable } from '@tanstack/react-table';
type Row = {
    id: number | string;
};
/** Serializable collection subset the trash actions need: drafts toggle and
 *  labels for confirm/toast copy. Mirrors what AutoColumnsBridge already
 *  forwards from the RSC. */
type TrashCollection = {
    slug: string;
    labels?: {
        singular?: unknown;
        plural?: unknown;
    } | null;
    versions?: {
        drafts?: unknown;
    } | null;
};
type TrashBulkActionsProps = {
    table: TanstackTable<Row>;
    collectionSlug: string;
    collection: TrashCollection;
    /** Mirrors Payload: only show Restore when the user can update. */
    canRestore?: boolean;
    /** Mirrors Payload: only show Permanent delete when the user can delete. */
    canDelete?: boolean;
};
export declare function TrashBulkActions({ table, collectionSlug, collection, canRestore, canDelete, }: TrashBulkActionsProps): import("react/jsx-runtime").JSX.Element;
export {};

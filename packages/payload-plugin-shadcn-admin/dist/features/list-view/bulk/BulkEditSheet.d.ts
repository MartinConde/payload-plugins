import * as React from 'react';
import type { ExtractedField } from 'payload-plugin-shadcn-ui';
/** The serializable collection subset the bulk-edit drawer needs (the same
 *  shape AutoColumnsBridge forwards). Kept exported for backward-compat with
 *  `payload-plugin-shadcn-admin/client`. */
export type BulkEditableCollection = {
    slug: string;
    fields: ExtractedField[];
};
export type BulkEditSheetProps = {
    collectionSlug: string;
    collection: BulkEditableCollection;
    selectedIds: (string | number)[];
    useAsTitleBySlug: Record<string, string | undefined>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};
export declare function BulkEditSheet({ collectionSlug, collection, selectedIds, useAsTitleBySlug, open, onOpenChange, onSuccess, }: BulkEditSheetProps): React.ReactElement;

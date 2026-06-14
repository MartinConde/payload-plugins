import * as React from 'react';
import type { ExtractedCollection } from 'payload-plugin-shadcn-ui';
export type UploadCreated = {
    id: string | number;
    slug: string;
};
export type UploadNewDialogProps = {
    open: boolean;
    onOpenChange: (next: boolean) => void;
    /** Active target upload collection slug (poly fields switch this upstream). */
    collectionSlug: string;
    /** Serializable metadata for every upload collection, keyed by slug. */
    uploadCollectionsBySlug: Record<string, ExtractedCollection>;
    useAsTitleBySlug: Record<string, string | undefined>;
    /** 1 → single-file (non-hasMany field). 0 / undefined → unlimited. */
    maxFiles?: number;
    /** Pre-seeded files (e.g. a collection-level multi-drop). */
    initialFiles?: File[];
    /** Fired once all rows that uploaded successfully are created. */
    onSuccess: (created: UploadCreated[]) => void;
};
export declare function UploadNewDialog({ open, onOpenChange, collectionSlug, uploadCollectionsBySlug, useAsTitleBySlug, maxFiles, initialFiles, onSuccess, }: UploadNewDialogProps): React.ReactElement;

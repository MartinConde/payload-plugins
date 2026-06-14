import * as React from 'react';
export type RestoreVersionProps = {
    /** Set for collection version restores. Mutually exclusive with globalSlug. */
    collectionSlug?: string;
    /** Set for global version restores → `/api/globals/{slug}/versions/{id}`. */
    globalSlug?: string;
    versionId: string;
    /** `/admin/collections/{slug}/{id}` or `/admin/globals/{slug}` — where to
     *  land after a restore. */
    basePath: string;
    /** When true (drafts enabled), also offer "Restore as draft". */
    draftsEnabled: boolean;
};
export declare function RestoreVersion({ collectionSlug, globalSlug, versionId, basePath, draftsEnabled, }: RestoreVersionProps): React.ReactElement;

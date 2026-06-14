import * as React from 'react';
export type VersionRow = {
    id: string;
    updatedAt: string;
    status: 'draft' | 'published' | null;
    autosave: boolean;
    publishedLocale: string | null;
};
export type VersionsListProps = {
    rows: VersionRow[];
    /** `/admin/collections/{slug}/{id}` — version links append `/versions/{id}`. */
    basePath: string;
    page: number;
    totalPages: number;
};
export declare function VersionsList({ rows, basePath, page, totalPages, }: VersionsListProps): React.ReactElement;

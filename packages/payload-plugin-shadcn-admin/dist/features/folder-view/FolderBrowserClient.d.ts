export type FolderItem = {
    itemKey: string;
    relationTo: string;
    value: {
        id: number | string;
        _folderOrDocumentTitle: string;
        filename?: string;
        url?: string;
    };
};
export type FolderBreadcrumb = {
    id: number | string;
    name: string;
};
export type FolderBrowserClientProps = {
    /** Route folder navigation pushes to, e.g. `/admin/browse-by-folder` or
     *  `/admin/collections/media`. */
    basePath: string;
    /** Admin route prefix for building document edit links, e.g. `/admin`. */
    adminRoute: string;
    /** Slug of the folders collection (`payload-folders`). */
    foldersSlug: string;
    /** Name of the folder relationship field (config.folders.fieldName). */
    folderFieldName: string;
    currentFolderID: number | string | null;
    breadcrumbs: FolderBreadcrumb[];
    subfolders: FolderItem[];
    documents: FolderItem[];
    /** Extra query params preserved on folder navigation (e.g. `{ view: 'folders' }`
     *  for the per-collection view). */
    extraQuery?: Record<string, string>;
    rootLabel?: string;
};
export declare function FolderBrowserClient({ basePath, adminRoute, foldersSlug, folderFieldName, currentFolderID, breadcrumbs, subfolders, documents, extraQuery, rootLabel, }: FolderBrowserClientProps): import("react/jsx-runtime").JSX.Element;

import type { Payload, TypedUser } from '../../internal/payloadAdapter.js';
import type { FolderBreadcrumb, FolderItem } from './FolderBrowserClient.js';
type Args = {
    payload: Payload;
    user?: TypedUser;
    locale?: string;
    collectionSlug: string;
    foldersSlug: string;
    folderFieldName: string;
    folderID: number | string | null;
    useAsTitle?: string;
    isUpload?: boolean;
};
export declare function getCollectionFolderData({ payload, user, locale, collectionSlug, foldersSlug, folderFieldName, folderID, useAsTitle, isUpload, }: Args): Promise<{
    breadcrumbs: FolderBreadcrumb[];
    subfolders: FolderItem[];
    documents: FolderItem[];
}>;
export {};

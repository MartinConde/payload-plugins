import * as React from 'react';
import type { FolderBreadcrumb } from './FolderBrowserClient.js';
export declare const DROP_ROOT = "crumb:__root__";
export declare function Breadcrumbs({ rootLabel, breadcrumbs, currentFolderID, onNavigate, }: {
    rootLabel: string;
    breadcrumbs: FolderBreadcrumb[];
    currentFolderID: number | string | null;
    onNavigate: (folderID: number | string | null) => void;
}): React.JSX.Element;

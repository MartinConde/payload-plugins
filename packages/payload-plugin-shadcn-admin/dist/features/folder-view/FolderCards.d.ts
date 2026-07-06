import * as React from 'react';
import type { FolderItem } from './FolderBrowserClient.js';
export declare function FolderCard({ item, selected, selectMode, onActivate, onRename, onDelete, renameLabel, deleteLabel, }: {
    item: FolderItem;
    selected: boolean;
    selectMode: boolean;
    onActivate: (item: FolderItem, opts: {
        shiftKey: boolean;
    }) => void;
    onRename: () => void;
    onDelete: () => void;
    renameLabel: string;
    deleteLabel: string;
}): React.JSX.Element;
export declare function DocCard({ item, selected, selectMode, onActivate, }: {
    item: FolderItem;
    selected: boolean;
    selectMode: boolean;
    onActivate: (item: FolderItem, opts: {
        shiftKey: boolean;
    }) => void;
}): React.JSX.Element;

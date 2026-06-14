import * as React from 'react';
import { CollectionListViewClient } from './CollectionListViewClient.js';
import { type BuildColumnsOptions } from './columns/autoColumns.js';
type AutoColumnsBridgeProps = BuildColumnsOptions & Omit<React.ComponentProps<typeof CollectionListViewClient>, 'columns'> & {
    /** Trash mode (viewType === 'trash'): swaps the default edit+delete bulk
     *  actions for restore + permanent-delete. Drives the trash branches in
     *  CollectionListViewClient too (forwarded via `isTrash`). */
    hasTrashPermission?: boolean;
};
export declare function AutoColumnsBridge({ collection, useAsTitleBySlug, hasTrashPermission, nativeCellFieldNames, nativeCellsByRow, ...clientProps }: AutoColumnsBridgeProps): import("react/jsx-runtime").JSX.Element;
export {};

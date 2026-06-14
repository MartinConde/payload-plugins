import type { UniqueIdentifier } from '@dnd-kit/core';
import type { MenuItem, MenuTree } from '../menuTree.js';
export type FlattenedItem = MenuItem & {
    parentId: string | null;
    depth: number;
    index: number;
};
/** Depth-first flatten, preserving order and recording parent + depth. */
export declare const flattenTree: (items: MenuTree, parentId?: string | null, depth?: number) => FlattenedItem[];
/** Rebuild a nested `MenuTree` from a flattened list. Children arrays are reset
 *  and repopulated from each row's (possibly updated) `parentId`. */
export declare const buildTree: (flattened: FlattenedItem[]) => MenuTree;
/** Remove the descendants of any id in `ids` from a flattened list (used to
 *  hide a dragged subtree and the children of collapsed rows). */
export declare const removeChildrenOf: (items: FlattenedItem[], ids: UniqueIdentifier[]) => FlattenedItem[];
/** Compute the projected depth + parent for the active drag, given the
 *  horizontal offset. Mirrors the dnd-kit sortable-tree example. */
export declare const getProjection: (items: FlattenedItem[], activeId: UniqueIdentifier, overId: UniqueIdentifier, dragOffset: number, indentationWidth: number, 
/** Max nesting LEVELS (1 = flat). Caps the projected depth at `levelCap - 1`.
 *  Undefined = unlimited. */
levelCap?: number) => {
    depth: number;
    maxDepth: number;
    minDepth: number;
    parentId: string | null;
};

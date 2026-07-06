import type { MenuItem, MenuTree } from '../menuTree.js';
import type { MenusTranslationsKeys } from '../translations.js';
export declare const INDENT = 28;
export type Tr = (key: MenusTranslationsKeys, fallback: string) => string;
export declare const patchItem: (tree: MenuTree, id: string, patch: Partial<MenuItem>) => MenuTree;
export declare const removeItem: (tree: MenuTree, id: string) => MenuTree;
export declare const addChild: (tree: MenuTree, parentId: string, child: MenuItem) => MenuTree;
export declare const freshId: () => string;
/** Deep-clone an item subtree with fresh ids (so a duplicate is independent). */
export declare const cloneItem: (item: MenuItem) => MenuItem;
/** Insert `node` immediately after the item with `id` (same parent/level). */
export declare const insertAfter: (tree: MenuTree, id: string, node: MenuItem) => MenuTree;
/** Find an item anywhere in the tree by id. */
export declare const findItem: (tree: MenuTree, id: string) => MenuItem | null;
/** Fetch a linked doc's title (for auto-filling an item's label). Tries the
 *  collection's useAsTitle field, then the usual title fields. Returns null on
 *  any failure — auto-fill is best-effort. */
export declare const fetchDocTitle: (slug: string, id: string, useAsTitle: string | undefined, locale: string | null | undefined) => Promise<string | null>;
/** Re-derive the label of every document-linked item from its linked doc's
 *  title IN `locale` (custom-URL items keep their label). Used by the sync
 *  "labels from linked documents" mode so copying en→fr gives French page
 *  titles. Keeps the existing label when a doc has no title in `locale` yet
 *  (so untranslated pages don't blank the label). Fetches are deduped. */
export declare const relabelFromDocs: (tree: MenuTree, locale: string | null, useAsTitleBySlug: Record<string, string | undefined>) => Promise<MenuTree>;
/** Collect every item's id → label, recursively (for label-preserving sync). */
export declare const labelMap: (tree: MenuTree, out?: Map<string, string>) => Map<string, string>;
/** Copy `source`, keeping each item's label from `keep` where the id matches
 *  (falls back to the source label for ids not present in `keep`). */
export declare const mergeKeepingLabels: (source: MenuTree, keep: MenuTree) => MenuTree;

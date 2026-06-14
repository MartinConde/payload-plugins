/** How a menu item resolves its destination. */
export type MenuItemLinkType = 'document' | 'custom';
/** A reference to a linked document. `relationTo` is the collection slug,
 *  `value` the document id (string or number, normalized to string here). */
export type MenuItemDocRef = {
    relationTo: string;
    value: string;
};
/** Derived, read-only fields the `afterRead` hook attaches per item so the
 *  frontend can render without follow-up lookups. Never persisted. */
export type MenuItemResolved = {
    /** Absolute-or-root-relative URL for the link, or null if unresolved. */
    url: string | null;
    /** The linked document's title, or null. Useful as a label fallback. */
    label: string | null;
};
/** One node in the menu tree. The editor owns this shape; it is stored as a
 *  single JSON blob in the `tree` field (per locale when localized). */
export type MenuItem = {
    /** Stable client id (uuid). Used as the dnd-kit sortable id and React key. */
    id: string;
    /** Visible label. Editable per item; localized via the field's locale slice. */
    label: string;
    type: MenuItemLinkType;
    /** Set when `type === 'document'`. */
    doc?: MenuItemDocRef | null;
    /** Set when `type === 'custom'`. */
    url?: string | null;
    /** Render the link with `target="_blank" rel="noopener"`. */
    newTab?: boolean;
    /** Extra CSS class(es) passed through to the rendered anchor. */
    className?: string | null;
    /** Nested submenu. Always an array (possibly empty). */
    children: MenuItem[];
    /** Hook-attached, read-only. Present on API reads, never written back. */
    resolved?: MenuItemResolved;
};
/** A menu tree is an ordered list of top-level items. */
export type MenuTree = MenuItem[];
/** Coerces an unknown (possibly malformed / legacy) value into a valid item,
 *  recursively. Guarantees `id` and `children` exist so the editor and the
 *  renderer never have to null-check structural fields. */
export declare const normalizeMenuItem: (raw: unknown) => MenuItem;
/** Coerces an unknown value into a valid `MenuTree`. */
export declare const normalizeMenuTree: (raw: unknown) => MenuTree;
/** Returns a copy of the tree with all `resolved` fields stripped — used before
 *  persisting so derived data never lands in the stored JSON. */
export declare const stripResolved: (tree: MenuTree) => MenuTree;
/** Depth-first map that lets a caller transform every item (e.g. attach
 *  `resolved`). The callback may return a partial patch merged onto the item;
 *  children are recursed automatically. */
export declare const mapMenuTree: (tree: MenuTree, fn: (item: MenuItem) => Partial<MenuItem>) => MenuTree;
/** Creates a fresh, empty item (used by the editor's "add item" action). */
export declare const newMenuItem: (overrides?: Partial<MenuItem>) => MenuItem;

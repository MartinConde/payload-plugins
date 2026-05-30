/* Shared, Node-safe menu-tree model + pure helpers.

   Imported by BOTH the server side (the `resolveMenuTree` afterRead hook, the
   collection config) and the client editor, and re-exported for the frontend.
   Keep it dependency-free (types + pure functions only) so it stays loadable in
   the Payload CLI's Node config graph. */

/** How a menu item resolves its destination. */
export type MenuItemLinkType = 'document' | 'custom'

/** A reference to a linked document. `relationTo` is the collection slug,
 *  `value` the document id (string or number, normalized to string here). */
export type MenuItemDocRef = {
  relationTo: string
  value: string
}

/** Derived, read-only fields the `afterRead` hook attaches per item so the
 *  frontend can render without follow-up lookups. Never persisted. */
export type MenuItemResolved = {
  /** Absolute-or-root-relative URL for the link, or null if unresolved. */
  url: string | null
  /** The linked document's title, or null. Useful as a label fallback. */
  label: string | null
}

/** One node in the menu tree. The editor owns this shape; it is stored as a
 *  single JSON blob in the `tree` field (per locale when localized). */
export type MenuItem = {
  /** Stable client id (uuid). Used as the dnd-kit sortable id and React key. */
  id: string
  /** Visible label. Editable per item; localized via the field's locale slice. */
  label: string
  type: MenuItemLinkType
  /** Set when `type === 'document'`. */
  doc?: MenuItemDocRef | null
  /** Set when `type === 'custom'`. */
  url?: string | null
  /** Render the link with `target="_blank" rel="noopener"`. */
  newTab?: boolean
  /** Extra CSS class(es) passed through to the rendered anchor. */
  className?: string | null
  /** Nested submenu. Always an array (possibly empty). */
  children: MenuItem[]
  /** Hook-attached, read-only. Present on API reads, never written back. */
  resolved?: MenuItemResolved
}

/** A menu tree is an ordered list of top-level items. */
export type MenuTree = MenuItem[]

const randomId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `item-${Math.random().toString(36).slice(2, 10)}`

/** Coerces an unknown (possibly malformed / legacy) value into a valid item,
 *  recursively. Guarantees `id` and `children` exist so the editor and the
 *  renderer never have to null-check structural fields. */
export const normalizeMenuItem = (raw: unknown): MenuItem => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const type: MenuItemLinkType = r.type === 'custom' ? 'custom' : 'document'
  const doc =
    r.doc && typeof r.doc === 'object'
      ? {
          relationTo: String((r.doc as Record<string, unknown>).relationTo ?? ''),
          value: String((r.doc as Record<string, unknown>).value ?? ''),
        }
      : null
  return {
    id: typeof r.id === 'string' && r.id ? r.id : randomId(),
    label: typeof r.label === 'string' ? r.label : '',
    type,
    doc: type === 'document' ? doc : null,
    url: type === 'custom' && typeof r.url === 'string' ? r.url : null,
    newTab: r.newTab === true,
    className:
      typeof r.className === 'string' && r.className.trim() ? r.className : null,
    children: normalizeMenuTree(r.children),
  }
}

/** Coerces an unknown value into a valid `MenuTree`. */
export const normalizeMenuTree = (raw: unknown): MenuTree =>
  Array.isArray(raw) ? raw.map(normalizeMenuItem) : []

/** Returns a copy of the tree with all `resolved` fields stripped — used before
 *  persisting so derived data never lands in the stored JSON. */
export const stripResolved = (tree: MenuTree): MenuTree =>
  tree.map(({ resolved: _resolved, ...item }) => ({
    ...item,
    children: stripResolved(item.children),
  }))

/** Depth-first map that lets a caller transform every item (e.g. attach
 *  `resolved`). The callback may return a partial patch merged onto the item;
 *  children are recursed automatically. */
export const mapMenuTree = (
  tree: MenuTree,
  fn: (item: MenuItem) => Partial<MenuItem>,
): MenuTree =>
  tree.map((item) => ({
    ...item,
    ...fn(item),
    children: mapMenuTree(item.children, fn),
  }))

/** Creates a fresh, empty item (used by the editor's "add item" action). */
export const newMenuItem = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: randomId(),
  label: '',
  type: 'document',
  doc: null,
  url: null,
  newTab: false,
  className: null,
  children: [],
  ...overrides,
})

/* Shared, Node-safe menu-tree model + pure helpers.

   Imported by BOTH the server side (the `resolveMenuTree` afterRead hook, the
   collection config) and the client editor, and re-exported for the frontend.
   Keep it dependency-free (types + pure functions only) so it stays loadable in
   the Payload CLI's Node config graph. */ /** How a menu item resolves its destination. */ const randomId = ()=>globalThis.crypto?.randomUUID?.() ?? `item-${Math.random().toString(36).slice(2, 10)}`;
/** Coerces an unknown (possibly malformed / legacy) value into a valid item,
 *  recursively. Guarantees `id` and `children` exist so the editor and the
 *  renderer never have to null-check structural fields. */ export const normalizeMenuItem = (raw)=>{
    const r = raw && typeof raw === 'object' ? raw : {};
    const type = r.type === 'custom' ? 'custom' : 'document';
    const doc = r.doc && typeof r.doc === 'object' ? {
        relationTo: String(r.doc.relationTo ?? ''),
        value: String(r.doc.value ?? '')
    } : null;
    return {
        id: typeof r.id === 'string' && r.id ? r.id : randomId(),
        label: typeof r.label === 'string' ? r.label : '',
        type,
        doc: type === 'document' ? doc : null,
        url: type === 'custom' && typeof r.url === 'string' ? r.url : null,
        newTab: r.newTab === true,
        className: typeof r.className === 'string' && r.className.trim() ? r.className : null,
        children: normalizeMenuTree(r.children)
    };
};
/** Coerces an unknown value into a valid `MenuTree`. */ export const normalizeMenuTree = (raw)=>Array.isArray(raw) ? raw.map(normalizeMenuItem) : [];
/** Returns a copy of the tree with all `resolved` fields stripped — used before
 *  persisting so derived data never lands in the stored JSON. */ export const stripResolved = (tree)=>tree.map(({ resolved: _resolved, ...item })=>({
            ...item,
            children: stripResolved(item.children)
        }));
/** Depth-first map that lets a caller transform every item (e.g. attach
 *  `resolved`). The callback may return a partial patch merged onto the item;
 *  children are recursed automatically. */ export const mapMenuTree = (tree, fn)=>tree.map((item)=>({
            ...item,
            ...fn(item),
            children: mapMenuTree(item.children, fn)
        }));
/** Creates a fresh, empty item (used by the editor's "add item" action). */ export const newMenuItem = (overrides = {})=>({
        id: randomId(),
        label: '',
        type: 'document',
        doc: null,
        url: null,
        newTab: false,
        className: null,
        children: [],
        ...overrides
    });

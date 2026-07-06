/* Pure tree mutations (operate on the nested tree; return a new tree) plus the
   doc-title lookups used by the locale-sync relabel mode. No React — kept
   separate so MenuTreeEditor.tsx stays focused on rendering. */ export const INDENT = 28;
export const patchItem = (tree, id, patch)=>tree.map((item)=>item.id === id ? {
            ...item,
            ...patch,
            children: patchItem(item.children, id, patch)
        } : {
            ...item,
            children: patchItem(item.children, id, patch)
        });
export const removeItem = (tree, id)=>tree.filter((item)=>item.id !== id).map((item)=>({
            ...item,
            children: removeItem(item.children, id)
        }));
export const addChild = (tree, parentId, child)=>tree.map((item)=>item.id === parentId ? {
            ...item,
            children: [
                ...item.children,
                child
            ]
        } : {
            ...item,
            children: addChild(item.children, parentId, child)
        });
export const freshId = ()=>globalThis.crypto?.randomUUID?.() ?? `item-${Math.random().toString(36).slice(2, 10)}`;
/** Deep-clone an item subtree with fresh ids (so a duplicate is independent). */ export const cloneItem = (item)=>({
        ...item,
        id: freshId(),
        children: item.children.map(cloneItem)
    });
/** Insert `node` immediately after the item with `id` (same parent/level). */ export const insertAfter = (tree, id, node)=>{
    const out = [];
    for (const item of tree){
        out.push({
            ...item,
            children: insertAfter(item.children, id, node)
        });
        if (item.id === id) out.push(node);
    }
    return out;
};
/** Find an item anywhere in the tree by id. */ export const findItem = (tree, id)=>{
    for (const item of tree){
        if (item.id === id) return item;
        const hit = findItem(item.children, id);
        if (hit) return hit;
    }
    return null;
};
/** Fetch a linked doc's title (for auto-filling an item's label). Tries the
 *  collection's useAsTitle field, then the usual title fields. Returns null on
 *  any failure — auto-fill is best-effort. */ export const fetchDocTitle = async (slug, id, useAsTitle, locale)=>{
    try {
        const params = new URLSearchParams({
            depth: '0',
            draft: 'true'
        });
        if (locale) params.set('locale', locale);
        const res = await fetch(`/api/${slug}/${id}?${params.toString()}`, {
            credentials: 'include'
        });
        if (!res.ok) return null;
        const doc = await res.json();
        for (const key of [
            useAsTitle,
            'title',
            'name',
            'label'
        ]){
            if (key && typeof doc[key] === 'string' && doc[key]) return doc[key];
        }
    } catch  {
    /* best-effort */ }
    return null;
};
/** Re-derive the label of every document-linked item from its linked doc's
 *  title IN `locale` (custom-URL items keep their label). Used by the sync
 *  "labels from linked documents" mode so copying en→fr gives French page
 *  titles. Keeps the existing label when a doc has no title in `locale` yet
 *  (so untranslated pages don't blank the label). Fetches are deduped. */ export const relabelFromDocs = async (tree, locale, useAsTitleBySlug)=>{
    const refs = new Map();
    const collect = (items)=>{
        for (const item of items){
            if (item.type === 'document' && item.doc?.value) {
                refs.set(`${item.doc.relationTo}:${item.doc.value}`, {
                    relationTo: item.doc.relationTo,
                    id: item.doc.value
                });
            }
            collect(item.children);
        }
    };
    collect(tree);
    const titles = new Map();
    await Promise.all([
        ...refs.entries()
    ].map(async ([key, { relationTo, id }])=>{
        titles.set(key, await fetchDocTitle(relationTo, id, useAsTitleBySlug?.[relationTo], locale));
    }));
    const walk = (items)=>items.map((item)=>{
            let label = item.label;
            if (item.type === 'document' && item.doc?.value) {
                const title = titles.get(`${item.doc.relationTo}:${item.doc.value}`);
                if (title) label = title;
            }
            return {
                ...item,
                label,
                children: walk(item.children)
            };
        });
    return walk(tree);
};
/** Collect every item's id → label, recursively (for label-preserving sync). */ export const labelMap = (tree, out = new Map())=>{
    for (const item of tree){
        out.set(item.id, item.label);
        labelMap(item.children, out);
    }
    return out;
};
/** Copy `source`, keeping each item's label from `keep` where the id matches
 *  (falls back to the source label for ids not present in `keep`). */ export const mergeKeepingLabels = (source, keep)=>{
    const labels = labelMap(keep);
    const walk = (items)=>items.map((item)=>({
                ...item,
                label: labels.has(item.id) ? labels.get(item.id) : item.label,
                children: walk(item.children)
            }));
    return walk(source);
};

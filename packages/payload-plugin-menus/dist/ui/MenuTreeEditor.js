'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* The heavy menu-tree editor, lazy-loaded by MenuTreeInput so its CSS-pulling
   imports never reach the Payload CLI's Node config load. Runs only in the
   browser, so it freely uses shadcn primitives, dnd-kit, and shadcn-admin's
   RelationshipPicker.

   Data contract: the bridge hands `value` = the active locale's stored tree
   (a localized `json` leaf is pre-sliced — see shadcn-admin's
   FieldTreeRenderer). Mutations call `onChange(stripResolved(nextTree))`, which
   the bridge merges back into the locale-keyed object for the active locale.

   The nested tree is edited via the canonical dnd-kit "sortable tree" pattern:
   flatten → one SortableContext → horizontal-drag depth projection → rebuild.

   Owns all tree/dnd state; row rendering lives in SortableTreeItem.tsx, the
   cross-locale sync panel in LocaleSync.tsx, and the pure tree mutations +
   doc-title lookups in menuTreeMutations.ts. */ import * as React from 'react';
import { PlusIcon } from 'lucide-react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useConfig, useTranslation } from '@payloadcms/ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { newMenuItem, normalizeMenuTree, stripResolved } from '../menuTree.js';
import { buildTree, flattenTree, getProjection, removeChildrenOf } from './treeUtils.js';
import { LocaleSync } from './LocaleSync.js';
import { SortableTreeItem } from './SortableTreeItem.js';
import { INDENT, addChild, cloneItem, fetchDocTitle, findItem, insertAfter, patchItem, removeItem } from './menuTreeMutations.js';
// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
export function MenuTreeEditor(props) {
    const { value, onChange, field, activeLocale, disabled, useAsTitleBySlug } = props;
    const { t } = useTranslation();
    const tr = React.useCallback((key, fallback)=>{
        const out = t(key);
        // useTranslation returns the key itself when unresolved — fall back then.
        return out && out !== key ? out : fallback;
    }, [
        t
    ]);
    // Both stashed inside the shadcn-admin namespace because extractCollection
    // only carries `custom['plugin-shadcn-admin']` across the RSC→client boundary.
    const pluginCustom = field.custom?.['plugin-shadcn-admin'];
    const linkableCollections = React.useMemo(()=>{
        const raw = pluginCustom?.linkableCollections;
        return Array.isArray(raw) && raw.length > 0 ? raw.map(String) : [
            'pages'
        ];
    }, [
        pluginCustom
    ]);
    const maxDepth = typeof pluginCustom?.maxDepth === 'number' && pluginCustom.maxDepth > 0 ? pluginCustom.maxDepth : undefined;
    // slug → display label, for the collection picker (shows "Pages" not "pages").
    const { config } = useConfig();
    const collectionLabels = React.useMemo(()=>{
        const out = {};
        const cols = config?.collections;
        const defaultLocale = config?.localization?.defaultLocale;
        const localeFallback = typeof defaultLocale === 'string' ? defaultLocale : 'en';
        for (const c of cols ?? []){
            const slug = String(c.slug);
            const labels = c.labels;
            const singular = labels?.singular;
            out[slug] = typeof singular === 'string' ? singular : singular && typeof singular === 'object' ? String(singular[activeLocale ?? localeFallback] ?? Object.values(singular)[0] ?? slug) : slug;
        }
        return out;
    }, [
        config,
        activeLocale
    ]);
    const tree = React.useMemo(()=>normalizeMenuTree(value), [
        value
    ]);
    // Latest tree, for async callbacks (auto-label fetch) that resolve after a
    // re-render and must read/patch the current tree, not a stale closure.
    const treeRef = React.useRef(tree);
    React.useEffect(()=>{
        treeRef.current = tree;
    }, [
        tree
    ]);
    const commit = React.useCallback((next)=>onChange(stripResolved(next)), [
        onChange
    ]);
    // Editor-local expand state (not persisted). Rows are COMPACT by default
    // (label + minimal info); only expanded rows show the edit fields and their
    // children. Newly added items are auto-expanded so they're immediately
    // editable.
    const [expanded, setExpanded] = React.useState(new Set());
    const toggleExpand = (id)=>setExpanded((prev)=>{
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const expand = (...ids)=>setExpanded((prev)=>{
            const next = new Set(prev);
            for (const id of ids)next.add(id);
            return next;
        });
    const expandAll = ()=>setExpanded(new Set(flattenTree(tree).map((i)=>i.id)));
    const collapseAll = ()=>setExpanded(new Set());
    // dnd ephemeral state
    const [activeId, setActiveId] = React.useState(null);
    const [overId, setOverId] = React.useState(null);
    const [offsetLeft, setOffsetLeft] = React.useState(0);
    const flattened = React.useMemo(()=>{
        const flat = flattenTree(tree);
        // A row hides its children unless it's expanded; the dragged subtree is
        // always hidden during a drag.
        const exclude = flat.filter((i)=>!expanded.has(i.id)).map((i)=>i.id);
        if (activeId != null) exclude.push(activeId);
        return removeChildrenOf(flat, exclude);
    }, [
        tree,
        expanded,
        activeId
    ]);
    const projected = activeId != null && overId != null ? getProjection(flattened, activeId, overId, offsetLeft, INDENT, maxDepth) : null;
    const sortedIds = React.useMemo(()=>flattened.map((i)=>i.id), [
        flattened
    ]);
    const activeItem = activeId != null ? flattened.find((i)=>i.id === String(activeId)) : null;
    // Ids that have a preceding sibling (→ can be indented), computed once over
    // the FULL flatten so the answer holds even when the prev sibling is collapsed.
    const indentableIds = React.useMemo(()=>{
        const flat = flattenTree(tree);
        const ids = new Set();
        flat.forEach((_, i)=>{
            if (prevSiblingOf(flat, i)) ids.add(flat[i].id);
        });
        return ids;
    }, [
        tree
    ]);
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 4
        }
    }), useSensor(KeyboardSensor));
    const resetDrag = ()=>{
        setActiveId(null);
        setOverId(null);
        setOffsetLeft(0);
    };
    const handleDragStart = ({ active })=>{
        setActiveId(active.id);
        setOverId(active.id);
    };
    const handleDragMove = ({ delta })=>setOffsetLeft(delta.x);
    const handleDragOver = ({ over })=>setOverId(over?.id ?? null);
    const handleDragEnd = ({ active, over })=>{
        resetDrag();
        if (!projected || !over) return;
        const { depth, parentId } = projected;
        const clone = flattenTree(tree);
        const activeIndex = clone.findIndex((i)=>i.id === String(active.id));
        const overIndex = clone.findIndex((i)=>i.id === String(over.id));
        if (activeIndex < 0 || overIndex < 0) return;
        clone[activeIndex] = {
            ...clone[activeIndex],
            depth,
            parentId
        };
        commit(buildTree(arrayMove(clone, activeIndex, overIndex)));
    };
    // Per-item mutation handlers.
    const onItemChange = (id, patch)=>commit(patchItem(tree, id, patch));
    const onItemRemove = (id)=>commit(removeItem(tree, id));
    const onItemDuplicate = (id)=>{
        const original = findItem(tree, id);
        if (!original) return;
        commit(insertAfter(tree, id, cloneItem(original)));
    };
    const onItemAddChild = (id)=>{
        const child = newMenuItem();
        expand(id, child.id); // reveal the parent's subtree + edit the new child
        commit(addChild(tree, id, child));
    };
    const onItemAddRoot = ()=>{
        const item = newMenuItem();
        expand(item.id);
        commit([
            ...tree,
            item
        ]);
    };
    const onIndent = (id)=>reparentRelative(id, 'indent');
    const onOutdent = (id)=>reparentRelative(id, 'outdent');
    // Selecting a document also auto-fills the label with the doc's title when the
    // label is still empty (never overwrites a label the editor typed). The title
    // fetch is async, so it re-checks the LATEST tree (treeRef) before patching.
    const onSelectDoc = (id, relationTo, value)=>{
        commit(patchItem(tree, id, {
            doc: {
                relationTo,
                value
            }
        }));
        if (!value) return;
        const current = findItem(tree, id);
        if (current && current.label.trim()) return;
        void fetchDocTitle(relationTo, value, useAsTitleBySlug?.[relationTo], activeLocale).then((title)=>{
            if (!title) return;
            const live = findItem(treeRef.current, id);
            if (!live || live.label.trim()) return;
            commit(patchItem(treeRef.current, id, {
                label: title
            }));
        });
    };
    // indent = become a child of the preceding sibling; outdent = become a
    // sibling of the current parent. Implemented over the full flatten so the
    // moved item keeps its own subtree (children rows keep parentId = item.id).
    const reparentRelative = (id, dir)=>{
        const flat = flattenTree(tree);
        const idx = flat.findIndex((i)=>i.id === id);
        if (idx < 0) return;
        const item = flat[idx];
        if (dir === 'indent') {
            const prevSibling = prevSiblingOf(flat, idx);
            if (!prevSibling) return;
            flat[idx] = {
                ...item,
                parentId: prevSibling.id
            };
        } else {
            if (item.parentId == null) return;
            const parent = flat.find((i)=>i.id === item.parentId);
            flat[idx] = {
                ...item,
                parentId: parent ? parent.parentId : null
            };
        }
        commit(buildTree(flat));
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-3",
        children: [
            activeLocale ? /*#__PURE__*/ _jsx(LocaleSync, {
                activeLocale: activeLocale,
                tree: tree,
                disabled: disabled,
                useAsTitleBySlug: useAsTitleBySlug,
                tr: tr,
                onApply: commit
            }) : null,
            flattened.length === 0 ? /*#__PURE__*/ _jsx("p", {
                className: "rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground",
                children: tr('pluginMenus:noItems', 'No items yet. Add your first menu item.')
            }) : /*#__PURE__*/ _jsxs(_Fragment, {
                children: [
                    flattenTree(tree).some((i)=>i.children.length > 0) ? /*#__PURE__*/ _jsxs("div", {
                        className: "flex items-center gap-3 text-xs text-muted-foreground",
                        children: [
                            /*#__PURE__*/ _jsx("button", {
                                type: "button",
                                onClick: expandAll,
                                className: "hover:text-foreground hover:underline",
                                children: tr('pluginMenus:expandAll', 'Expand all')
                            }),
                            /*#__PURE__*/ _jsx("button", {
                                type: "button",
                                onClick: collapseAll,
                                className: "hover:text-foreground hover:underline",
                                children: tr('pluginMenus:collapseAll', 'Collapse all')
                            })
                        ]
                    }) : null,
                    /*#__PURE__*/ _jsxs(DndContext, {
                        sensors: sensors,
                        collisionDetection: closestCenter,
                        onDragStart: handleDragStart,
                        onDragMove: handleDragMove,
                        onDragOver: handleDragOver,
                        onDragEnd: handleDragEnd,
                        onDragCancel: resetDrag,
                        children: [
                            /*#__PURE__*/ _jsx(SortableContext, {
                                items: sortedIds,
                                strategy: verticalListSortingStrategy,
                                children: /*#__PURE__*/ _jsx("div", {
                                    className: "flex flex-col gap-2",
                                    children: flattened.map((item, i)=>/*#__PURE__*/ _jsx(SortableTreeItem, {
                                            item: item,
                                            depth: item.id === String(activeId) && projected ? projected.depth : item.depth,
                                            childCount: item.children.length,
                                            expanded: expanded.has(item.id),
                                            canIndent: indentableIds.has(item.id) && (maxDepth == null || item.depth + 1 <= maxDepth - 1),
                                            canOutdent: item.parentId != null,
                                            canAddChild: maxDepth == null || item.depth + 1 <= maxDepth - 1,
                                            disabled: Boolean(disabled),
                                            linkableCollections: linkableCollections,
                                            collectionLabels: collectionLabels,
                                            useAsTitleBySlug: useAsTitleBySlug,
                                            activeLocale: activeLocale ?? null,
                                            tr: tr,
                                            onToggleExpand: ()=>toggleExpand(item.id),
                                            onChange: (patch)=>onItemChange(item.id, patch),
                                            onSelectDoc: (relationTo, value)=>onSelectDoc(item.id, relationTo, value),
                                            onRemove: ()=>onItemRemove(item.id),
                                            onDuplicate: ()=>onItemDuplicate(item.id),
                                            onAddChild: ()=>onItemAddChild(item.id),
                                            onIndent: ()=>onIndent(item.id),
                                            onOutdent: ()=>onOutdent(item.id)
                                        }, item.id))
                                })
                            }),
                            /*#__PURE__*/ _jsx(DragOverlay, {
                                children: activeItem ? /*#__PURE__*/ _jsx("div", {
                                    className: "rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-lg",
                                    children: activeItem.label || tr('pluginMenus:untitled', 'Untitled item')
                                }) : null
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs(Button, {
                type: "button",
                variant: "outline",
                size: "sm",
                disabled: disabled,
                onClick: onItemAddRoot,
                className: "self-start",
                children: [
                    /*#__PURE__*/ _jsx(PlusIcon, {
                        className: "size-3"
                    }),
                    tr('pluginMenus:addItem', 'Add item')
                ]
            })
        ]
    });
}
/** Nearest earlier row that is a sibling of `flat[idx]` (same parent, same
 *  depth, with only descendants of earlier siblings in between). */ const prevSiblingOf = (flat, idx)=>{
    if (idx < 0) return null;
    const self = flat[idx];
    for(let i = idx - 1; i >= 0; i--){
        if (flat[i].depth < self.depth) return null // hit the parent → no prev sibling
        ;
        if (flat[i].depth === self.depth && flat[i].parentId === self.parentId) {
            return flat[i];
        }
    }
    return null;
};

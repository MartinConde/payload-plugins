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
   flatten → one SortableContext → horizontal-drag depth projection → rebuild. */ import * as React from 'react';
import { ChevronDownIcon, ChevronRightIcon, CopyIcon, ExternalLinkIcon, GripVerticalIcon, IndentDecreaseIcon, IndentIncreaseIcon, LanguagesIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useConfig, useTranslation } from '@payloadcms/ui';
import { Badge, Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useDocIdentity } from 'payload-plugin-shadcn-ui';
import { DocPicker } from './DocPicker.js';
import { newMenuItem, normalizeMenuTree, stripResolved } from '../menuTree.js';
import { buildTree, flattenTree, getProjection, removeChildrenOf } from './treeUtils.js';
const INDENT = 28;
// ---------------------------------------------------------------------------
// Pure tree mutations (operate on the nested tree; return a new tree).
// ---------------------------------------------------------------------------
const patchItem = (tree, id, patch)=>tree.map((item)=>item.id === id ? {
            ...item,
            ...patch,
            children: patchItem(item.children, id, patch)
        } : {
            ...item,
            children: patchItem(item.children, id, patch)
        });
const removeItem = (tree, id)=>tree.filter((item)=>item.id !== id).map((item)=>({
            ...item,
            children: removeItem(item.children, id)
        }));
const addChild = (tree, parentId, child)=>tree.map((item)=>item.id === parentId ? {
            ...item,
            children: [
                ...item.children,
                child
            ]
        } : {
            ...item,
            children: addChild(item.children, parentId, child)
        });
const freshId = ()=>globalThis.crypto?.randomUUID?.() ?? `item-${Math.random().toString(36).slice(2, 10)}`;
/** Deep-clone an item subtree with fresh ids (so a duplicate is independent). */ const cloneItem = (item)=>({
        ...item,
        id: freshId(),
        children: item.children.map(cloneItem)
    });
/** Insert `node` immediately after the item with `id` (same parent/level). */ const insertAfter = (tree, id, node)=>{
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
/** Find an item anywhere in the tree by id. */ const findItem = (tree, id)=>{
    for (const item of tree){
        if (item.id === id) return item;
        const hit = findItem(item.children, id);
        if (hit) return hit;
    }
    return null;
};
/** Fetch a linked doc's title (for auto-filling an item's label). Tries the
 *  collection's useAsTitle field, then the usual title fields. Returns null on
 *  any failure — auto-fill is best-effort. */ const fetchDocTitle = async (slug, id, useAsTitle, locale)=>{
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
 *  (so untranslated pages don't blank the label). Fetches are deduped. */ const relabelFromDocs = async (tree, locale, useAsTitleBySlug)=>{
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
/** Collect every item's id → label, recursively (for label-preserving sync). */ const labelMap = (tree, out = new Map())=>{
    for (const item of tree){
        out.set(item.id, item.label);
        labelMap(item.children, out);
    }
    return out;
};
/** Copy `source`, keeping each item's label from `keep` where the id matches
 *  (falls back to the source label for ids not present in `keep`). */ const mergeKeepingLabels = (source, keep)=>{
    const labels = labelMap(keep);
    const walk = (items)=>items.map((item)=>({
                ...item,
                label: labels.has(item.id) ? labels.get(item.id) : item.label,
                children: walk(item.children)
            }));
    return walk(source);
};
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
        for (const c of cols ?? []){
            const slug = String(c.slug);
            const labels = c.labels;
            const singular = labels?.singular;
            out[slug] = typeof singular === 'string' ? singular : singular && typeof singular === 'object' ? String(singular[activeLocale ?? 'en'] ?? Object.values(singular)[0] ?? slug) : slug;
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
function SortableTreeItem({ item, depth, childCount, expanded, canIndent, canOutdent, canAddChild, disabled, linkableCollections, collectionLabels, useAsTitleBySlug, activeLocale, tr, onToggleExpand, onChange, onSelectDoc, onRemove, onDuplicate, onAddChild, onIndent, onOutdent }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id
    });
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        marginLeft: depth * INDENT
    };
    const relationTo = item.doc?.relationTo && linkableCollections.includes(item.doc.relationTo) ? item.doc.relationTo : linkableCollections[0];
    const setType = (type)=>onChange({
            type,
            doc: type === 'document' ? item.doc ?? {
                relationTo: linkableCollections[0],
                value: ''
            } : null,
            url: type === 'custom' ? item.url ?? '' : null
        });
    // Flag items with no usable link target (no document selected / empty URL).
    const isBroken = item.type === 'document' ? !item.doc?.value : !(item.url && item.url.trim());
    // One-line summary shown in the collapsed (compact) state.
    const summary = item.type === 'custom' ? item.url || '' : item.doc?.value ? collectionLabels[relationTo] ?? relationTo : tr('pluginMenus:linkDocument', 'Document');
    // Collapsed rows are a single centered line; expanded rows top-align so the
    // left/right icon columns sit beside the first input row.
    const sideMt = expanded ? 'mt-1' : '';
    return /*#__PURE__*/ _jsx(Card, {
        ref: setNodeRef,
        style: style,
        className: "gap-0 py-0",
        children: /*#__PURE__*/ _jsxs(CardContent, {
            className: `flex flex-row gap-2 px-2 py-1.5 ${expanded ? 'items-start' : 'items-center'}`,
            children: [
                /*#__PURE__*/ _jsx("button", {
                    type: "button",
                    ...attributes,
                    ...listeners,
                    disabled: disabled,
                    className: `${sideMt} shrink-0 cursor-grab text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50`,
                    "aria-label": tr('pluginMenus:dragToReorder', 'Drag to reorder'),
                    children: /*#__PURE__*/ _jsx(GripVerticalIcon, {
                        className: "size-4"
                    })
                }),
                /*#__PURE__*/ _jsx("button", {
                    type: "button",
                    onClick: onToggleExpand,
                    className: `${sideMt} shrink-0 text-muted-foreground hover:text-foreground`,
                    "aria-label": expanded ? tr('pluginMenus:collapse', 'Collapse') : tr('pluginMenus:expand', 'Expand'),
                    children: expanded ? /*#__PURE__*/ _jsx(ChevronDownIcon, {
                        className: "size-4"
                    }) : /*#__PURE__*/ _jsx(ChevronRightIcon, {
                        className: "size-4"
                    })
                }),
                expanded ? /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-1 flex-col gap-2.5",
                    children: [
                        /*#__PURE__*/ _jsxs("div", {
                            className: "flex flex-wrap items-center gap-2",
                            children: [
                                /*#__PURE__*/ _jsxs(Select, {
                                    value: item.type,
                                    disabled: disabled,
                                    onValueChange: (v)=>setType(v),
                                    children: [
                                        /*#__PURE__*/ _jsx(SelectTrigger, {
                                            className: "h-8 w-[8.5rem] shrink-0",
                                            children: /*#__PURE__*/ _jsx(SelectValue, {})
                                        }),
                                        /*#__PURE__*/ _jsxs(SelectContent, {
                                            children: [
                                                /*#__PURE__*/ _jsx(SelectItem, {
                                                    value: "document",
                                                    children: tr('pluginMenus:linkDocument', 'Document')
                                                }),
                                                /*#__PURE__*/ _jsx(SelectItem, {
                                                    value: "custom",
                                                    children: tr('pluginMenus:linkCustom', 'Custom URL')
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                item.type === 'document' ? /*#__PURE__*/ _jsxs(_Fragment, {
                                    children: [
                                        linkableCollections.length > 1 ? /*#__PURE__*/ _jsxs(Select, {
                                            value: relationTo,
                                            disabled: disabled,
                                            onValueChange: (slug)=>onSelectDoc(slug, ''),
                                            children: [
                                                /*#__PURE__*/ _jsx(SelectTrigger, {
                                                    className: "h-8 w-[10rem] shrink-0",
                                                    children: /*#__PURE__*/ _jsx(SelectValue, {})
                                                }),
                                                /*#__PURE__*/ _jsx(SelectContent, {
                                                    children: linkableCollections.map((slug)=>/*#__PURE__*/ _jsx(SelectItem, {
                                                            value: slug,
                                                            children: collectionLabels[slug] ?? slug
                                                        }, slug))
                                                })
                                            ]
                                        }) : null,
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "min-w-[12rem] flex-1",
                                            children: /*#__PURE__*/ _jsx(DocPicker, {
                                                relatedSlug: relationTo,
                                                useAsTitle: useAsTitleBySlug?.[relationTo],
                                                value: item.doc?.value || null,
                                                onChange: (v)=>onSelectDoc(relationTo, v ?? ''),
                                                activeLocale: activeLocale,
                                                disabled: disabled,
                                                placeholder: tr('pluginMenus:docSelectPlaceholder', 'Select a document…'),
                                                searchPlaceholder: tr('pluginMenus:docSearchPlaceholder', 'Search documents…'),
                                                emptyLabel: tr('pluginMenus:docNoResults', 'No documents found'),
                                                clearLabel: tr('pluginMenus:docClear', 'Clear selection')
                                            })
                                        }),
                                        item.doc?.value ? /*#__PURE__*/ _jsx("a", {
                                            href: `/admin/collections/${relationTo}/${item.doc.value}`,
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                            title: tr('pluginMenus:openDocument', 'Open linked document'),
                                            "aria-label": tr('pluginMenus:openDocument', 'Open linked document'),
                                            className: "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                                            children: /*#__PURE__*/ _jsx(ExternalLinkIcon, {
                                                className: "size-4"
                                            })
                                        }) : null
                                    ]
                                }) : /*#__PURE__*/ _jsx(Input, {
                                    value: item.url ?? '',
                                    disabled: disabled,
                                    placeholder: tr('pluginMenus:customUrlPlaceholder', 'https://… or /path'),
                                    onChange: (e)=>onChange({
                                            url: e.target.value
                                        }),
                                    className: "h-8 min-w-[12rem] flex-1"
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "flex flex-wrap items-center gap-3",
                            children: [
                                /*#__PURE__*/ _jsx(Input, {
                                    value: item.label,
                                    disabled: disabled,
                                    placeholder: tr('pluginMenus:labelPlaceholder', 'Menu label'),
                                    onChange: (e)=>onChange({
                                            label: e.target.value
                                        }),
                                    className: "h-8 min-w-[12rem] flex-1"
                                }),
                                /*#__PURE__*/ _jsxs("label", {
                                    className: "inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground",
                                    children: [
                                        /*#__PURE__*/ _jsx("input", {
                                            type: "checkbox",
                                            checked: item.newTab === true,
                                            disabled: disabled,
                                            onChange: (e)=>onChange({
                                                    newTab: e.target.checked
                                                }),
                                            className: "size-3.5 accent-primary"
                                        }),
                                        /*#__PURE__*/ _jsx(ExternalLinkIcon, {
                                            className: "size-3"
                                        }),
                                        tr('pluginMenus:openNewTab', 'Open in new tab')
                                    ]
                                }),
                                /*#__PURE__*/ _jsx(Input, {
                                    value: item.className ?? '',
                                    disabled: disabled,
                                    placeholder: tr('pluginMenus:cssClassPlaceholder', 'e.g. is-highlighted'),
                                    onChange: (e)=>onChange({
                                            className: e.target.value
                                        }),
                                    className: "h-8 w-[12rem] shrink-0",
                                    "aria-label": tr('pluginMenus:cssClassLabel', 'CSS class')
                                }),
                                isBroken ? /*#__PURE__*/ _jsxs("span", {
                                    className: "inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400",
                                    children: [
                                        /*#__PURE__*/ _jsx(TriangleAlertIcon, {
                                            className: "size-3.5"
                                        }),
                                        tr('pluginMenus:brokenLink', 'No link target set')
                                    ]
                                }) : null
                            ]
                        })
                    ]
                }) : /* Compact (collapsed): label + minimal info; click to expand. */ /*#__PURE__*/ _jsxs("button", {
                    type: "button",
                    onClick: onToggleExpand,
                    className: "flex min-h-[1.75rem] flex-1 items-center gap-2 overflow-hidden text-left",
                    children: [
                        isBroken ? /*#__PURE__*/ _jsx(TriangleAlertIcon, {
                            className: "size-3.5 shrink-0 text-amber-500",
                            "aria-label": tr('pluginMenus:brokenLink', 'No link target set')
                        }) : null,
                        /*#__PURE__*/ _jsx("span", {
                            className: `truncate text-sm font-medium ${item.label ? '' : 'italic text-muted-foreground'}`,
                            children: item.label || tr('pluginMenus:untitled', 'Untitled item')
                        }),
                        childCount > 0 ? /*#__PURE__*/ _jsx(Badge, {
                            variant: "secondary",
                            className: "shrink-0",
                            children: childCount
                        }) : null,
                        summary ? /*#__PURE__*/ _jsx("span", {
                            className: "ml-auto max-w-[45%] truncate text-xs text-muted-foreground",
                            children: summary
                        }) : null,
                        item.newTab ? /*#__PURE__*/ _jsx(ExternalLinkIcon, {
                            className: "size-3 shrink-0 text-muted-foreground"
                        }) : null
                    ]
                }),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex shrink-0 flex-col items-center gap-0.5",
                    children: [
                        /*#__PURE__*/ _jsx(IconButton, {
                            disabled: disabled,
                            onClick: onRemove,
                            destructive: true,
                            label: tr('pluginMenus:removeItem', 'Remove item'),
                            children: /*#__PURE__*/ _jsx(Trash2Icon, {
                                className: "size-4"
                            })
                        }),
                        expanded ? /*#__PURE__*/ _jsxs(_Fragment, {
                            children: [
                                /*#__PURE__*/ _jsx(IconButton, {
                                    disabled: disabled,
                                    onClick: onDuplicate,
                                    label: tr('pluginMenus:duplicateItem', 'Duplicate item'),
                                    children: /*#__PURE__*/ _jsx(CopyIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(IconButton, {
                                    disabled: disabled || !canOutdent,
                                    onClick: onOutdent,
                                    label: tr('pluginMenus:outdent', 'Move out one level'),
                                    children: /*#__PURE__*/ _jsx(IndentDecreaseIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(IconButton, {
                                    disabled: disabled || !canIndent,
                                    onClick: onIndent,
                                    label: tr('pluginMenus:indent', 'Nest under previous item'),
                                    children: /*#__PURE__*/ _jsx(IndentIncreaseIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(IconButton, {
                                    disabled: disabled || !canAddChild,
                                    onClick: onAddChild,
                                    label: tr('pluginMenus:addChild', 'Add sub-item'),
                                    children: /*#__PURE__*/ _jsx(PlusIcon, {
                                        className: "size-4"
                                    })
                                })
                            ]
                        }) : null
                    ]
                })
            ]
        })
    });
}
function IconButton({ disabled, onClick, label, destructive, children }) {
    return /*#__PURE__*/ _jsx("button", {
        type: "button",
        onClick: onClick,
        disabled: disabled,
        "aria-label": label,
        title: label,
        className: `flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${destructive ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-muted hover:text-foreground'}`,
        children: children
    });
}
// ---------------------------------------------------------------------------
// Locale sync
// ---------------------------------------------------------------------------
function LocaleSync({ activeLocale, tree, disabled, useAsTitleBySlug, tr, onApply }) {
    const { config } = useConfig();
    const { collectionSlug, documentId } = useDocIdentity();
    const locales = React.useMemo(()=>{
        const loc = config?.localization;
        if (!loc || typeof loc !== 'object') return [];
        const list = loc.locales;
        if (!Array.isArray(list)) return [];
        return list.map((l)=>({
                code: l.code,
                label: typeof l.label === 'string' ? l.label : l.code
            }));
    }, [
        config
    ]);
    const sources = locales.filter((l)=>l.code !== activeLocale);
    const [source, setSource] = React.useState('');
    // 'relabel' (default): re-derive document labels from the linked doc's title
    // in the current language. 'labels': copy source labels as-is. 'structure':
    // keep current labels where item ids match.
    const [mode, setMode] = React.useState('relabel');
    const [status, setStatus] = React.useState('idle');
    if (sources.length === 0) return null;
    const canSync = !disabled && documentId != null && collectionSlug != null && source !== '';
    const apply = async ()=>{
        if (!canSync) return;
        setStatus('loading');
        try {
            const res = await fetch(`/api/${collectionSlug}/${documentId}?locale=${source}&depth=0&draft=true`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error(String(res.status));
            const body = await res.json();
            const sourceTree = normalizeMenuTree(body.tree);
            // Never silently wipe the current language: the source read is of SAVED
            // data, so an unsaved/empty source would otherwise blow away the current
            // tree. Bail with a clear hint instead.
            if (sourceTree.length === 0) {
                setStatus('empty');
                return;
            }
            // Replacing existing items is destructive — confirm first.
            if (tree.length > 0 && !window.confirm(tr('pluginMenus:syncConfirmOverwrite', 'Replace the current language’s items with the copied structure?'))) {
                setStatus('idle');
                return;
            }
            const next = mode === 'labels' ? sourceTree : mode === 'structure' ? mergeKeepingLabels(sourceTree, tree) : await relabelFromDocs(sourceTree, activeLocale, useAsTitleBySlug);
            onApply(next);
            setStatus('done');
        } catch  {
            setStatus('error');
        }
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                children: [
                    /*#__PURE__*/ _jsx(LanguagesIcon, {
                        className: "size-3.5"
                    }),
                    tr('pluginMenus:syncTitle', 'Sync from another language')
                ]
            }),
            /*#__PURE__*/ _jsx("p", {
                className: "text-xs text-muted-foreground",
                children: tr('pluginMenus:syncHint', 'Copies the saved structure of another language — save your changes first.')
            }),
            documentId == null ? /*#__PURE__*/ _jsx("p", {
                className: "text-xs text-muted-foreground",
                children: tr('pluginMenus:syncSaveFirst', 'Save the menu once before syncing languages.')
            }) : /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-wrap items-center gap-2",
                children: [
                    /*#__PURE__*/ _jsxs(Select, {
                        value: source,
                        onValueChange: setSource,
                        disabled: disabled,
                        children: [
                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                className: "h-8 w-[12rem]",
                                children: /*#__PURE__*/ _jsx(SelectValue, {
                                    placeholder: tr('pluginMenus:syncSourceLabel', 'Source language')
                                })
                            }),
                            /*#__PURE__*/ _jsx(SelectContent, {
                                children: sources.map((l)=>/*#__PURE__*/ _jsx(SelectItem, {
                                        value: l.code,
                                        children: l.label
                                    }, l.code))
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs(Select, {
                        value: mode,
                        onValueChange: (v)=>setMode(v),
                        disabled: disabled,
                        children: [
                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                className: "h-8 w-[22rem]",
                                children: /*#__PURE__*/ _jsx(SelectValue, {})
                            }),
                            /*#__PURE__*/ _jsxs(SelectContent, {
                                children: [
                                    /*#__PURE__*/ _jsx(SelectItem, {
                                        value: "relabel",
                                        children: tr('pluginMenus:syncCopyRelabel', 'Labels from linked documents (this language)')
                                    }),
                                    /*#__PURE__*/ _jsx(SelectItem, {
                                        value: "labels",
                                        children: tr('pluginMenus:syncCopyWithLabels', 'Structure and labels (copy as-is)')
                                    }),
                                    /*#__PURE__*/ _jsx(SelectItem, {
                                        value: "structure",
                                        children: tr('pluginMenus:syncCopyStructureOnly', 'Structure only (keep current labels)')
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsx(Button, {
                        type: "button",
                        size: "sm",
                        disabled: !canSync || status === 'loading',
                        onClick: apply,
                        children: status === 'loading' ? tr('pluginMenus:syncLoading', 'Loading…') : tr('pluginMenus:syncApply', 'Copy into current language')
                    }),
                    status === 'error' ? /*#__PURE__*/ _jsx("span", {
                        className: "text-xs text-destructive",
                        children: tr('pluginMenus:syncError', 'Could not load that language. Please try again.')
                    }) : null,
                    status === 'empty' ? /*#__PURE__*/ _jsx("span", {
                        className: "text-xs text-amber-600 dark:text-amber-400",
                        children: tr('pluginMenus:syncEmptySource', 'The source language has no saved items. Save your changes first, then sync.')
                    }) : null,
                    status === 'done' ? /*#__PURE__*/ _jsx("span", {
                        className: "text-xs text-emerald-600 dark:text-emerald-400",
                        children: tr('pluginMenus:syncDone', 'Copied')
                    }) : null
                ]
            })
        ]
    });
}

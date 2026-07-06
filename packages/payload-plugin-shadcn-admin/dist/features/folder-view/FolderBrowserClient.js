'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CheckSquare, File as FileIcon, Folder, FolderPlus } from 'lucide-react';
import { toast, useLocale, useTranslation } from '../../internal/payloadAdapterUI.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Label } from 'payload-plugin-shadcn-ui';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from 'payload-plugin-shadcn-ui';
import { Breadcrumbs, DROP_ROOT } from './FolderBreadcrumbs.js';
import { DocCard, FolderCard } from './FolderCards.js';
export function FolderBrowserClient({ basePath, adminRoute, foldersSlug, folderFieldName, currentFolderID, breadcrumbs, subfolders, documents, extraQuery, rootLabel = 'Folders' }) {
    const router = useRouter();
    const { t } = useTranslation();
    const locale = useLocale();
    const localeCode = locale && typeof locale === 'object' && 'code' in locale ? locale.code : undefined;
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 6
        }
    }));
    const [busy, setBusy] = React.useState(false);
    const [newOpen, setNewOpen] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [renameTarget, setRenameTarget] = React.useState(null);
    const [renameName, setRenameName] = React.useState('');
    const [activeItem, setActiveItem] = React.useState(null);
    const openItemRef = React.useRef(()=>{});
    const [selectMode, setSelectMode] = React.useState(false);
    const [selected, setSelected] = React.useState(new Set());
    const [anchorKey, setAnchorKey] = React.useState(null);
    const clearSelection = React.useCallback(()=>{
        setSelected(new Set());
        setAnchorKey(null);
    }, []);
    const itemByKey = React.useMemo(()=>{
        const map = new Map();
        for (const it of [
            ...subfolders,
            ...documents
        ])map.set(it.itemKey, it);
        return map;
    }, [
        subfolders,
        documents
    ]);
    // Rendered order — used for shift-click range selection.
    const orderedKeys = React.useMemo(()=>[
            ...subfolders,
            ...documents
        ].map((it)=>it.itemKey), [
        subfolders,
        documents
    ]);
    // Click handler for item cards. In select mode, click toggles selection and
    // shift-click selects the range from the anchor; otherwise it opens the item.
    const handleActivate = React.useCallback((item, opts)=>{
        if (!selectMode) {
            openItemRef.current(item);
            return;
        }
        if (opts.shiftKey && anchorKey) {
            const a = orderedKeys.indexOf(anchorKey);
            const b = orderedKeys.indexOf(item.itemKey);
            if (a !== -1 && b !== -1) {
                const [lo, hi] = a < b ? [
                    a,
                    b
                ] : [
                    b,
                    a
                ];
                setSelected((prev)=>{
                    const next = new Set(prev);
                    for(let i = lo; i <= hi; i++)next.add(orderedKeys[i]);
                    return next;
                });
            }
            return;
        }
        setSelected((prev)=>{
            const next = new Set(prev);
            if (next.has(item.itemKey)) next.delete(item.itemKey);
            else next.add(item.itemKey);
            return next;
        });
        setAnchorKey(item.itemKey);
    }, [
        selectMode,
        anchorKey,
        orderedKeys
    ]);
    const toggleSelectMode = React.useCallback(()=>{
        setSelectMode((on)=>{
            if (on) clearSelection(); // leaving select mode clears the selection
            return !on;
        });
    }, [
        clearSelection
    ]);
    // Drop stale selections when the folder contents change (navigation, refresh).
    React.useEffect(()=>{
        setSelected((prev)=>{
            if (prev.size === 0) return prev;
            const next = new Set();
            for (const k of prev)if (itemByKey.has(k)) next.add(k);
            return next.size === prev.size ? prev : next;
        });
    }, [
        itemByKey
    ]);
    const hrefFor = React.useCallback((folderID)=>{
        const params = new URLSearchParams(extraQuery);
        if (folderID != null) params.set('folderID', String(folderID));
        const qs = params.toString();
        return qs ? `${basePath}?${qs}` : basePath;
    }, [
        basePath,
        extraQuery
    ]);
    const navTo = React.useCallback((folderID)=>router.push(hrefFor(folderID)), [
        router,
        hrefFor
    ]);
    const openItem = React.useCallback((item)=>{
        if (item.relationTo === foldersSlug) {
            navTo(item.value.id);
            return;
        }
        router.push(`${adminRoute}/collections/${item.relationTo}/${item.value.id}`);
    }, [
        adminRoute,
        foldersSlug,
        navTo,
        router
    ]);
    // Latest-value ref so handleActivate (defined earlier) can open without a
    // dependency cycle.
    openItemRef.current = openItem;
    /* ---- mutations (mirror Payload's FoldersProvider request shapes) ---- */ const createFolder = async ()=>{
        const name = newName.trim();
        if (!name) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/${foldersSlug}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    [folderFieldName]: currentFolderID ?? null
                })
            });
            if (!res.ok) throw new Error(String(res.status));
            setNewOpen(false);
            setNewName('');
            router.refresh();
        } catch  {
            toast.error(t('error:unknown'));
        } finally{
            setBusy(false);
        }
    };
    const renameFolder = async ()=>{
        const name = renameName.trim();
        if (!renameTarget || !name) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/${foldersSlug}/${renameTarget.value.id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name
                })
            });
            if (!res.ok) throw new Error(String(res.status));
            setRenameTarget(null);
            router.refresh();
        } catch  {
            toast.error(t('error:unknown'));
        } finally{
            setBusy(false);
        }
    };
    const deleteFolder = async (item)=>{
        if (!window.confirm(`${t('folder:deleteFolder')}: ${item.value._folderOrDocumentTitle}?`)) {
            return;
        }
        setBusy(true);
        try {
            const res = await fetch(`/api/${foldersSlug}/${item.value.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error(String(res.status));
            router.refresh();
        } catch  {
            toast.error(t('error:unknown'));
        } finally{
            setBusy(false);
        }
    };
    const moveItems = async (items, toFolderID)=>{
        if (!items.length) return;
        setBusy(true);
        try {
            // Mirror Payload's FoldersProvider.moveToFolder: group by collection and
            // bulk-PATCH the folder field via the `where` endpoint, scoped to the
            // active locale (otherwise Payload validates required localized fields
            // across ALL locales and a doc with empty locales fails).
            const idsByRelation = new Map();
            for (const it of items){
                const arr = idsByRelation.get(it.relationTo) ?? [];
                arr.push(it.value.id);
                idsByRelation.set(it.relationTo, arr);
            }
            for (const [relationTo, ids] of idsByRelation){
                const params = new URLSearchParams();
                params.set('depth', '0');
                params.set('limit', '0');
                if (localeCode) params.set('locale', localeCode);
                ids.forEach((id)=>params.append('where[id][in][]', String(id)));
                const res = await fetch(`/api/${relationTo}?${params.toString()}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        [folderFieldName]: toFolderID ?? null
                    })
                });
                // Bulk update returns 200 with a per-doc `errors` array on failure.
                let json = null;
                try {
                    json = await res.json();
                } catch  {
                    json = null;
                }
                if (!res.ok || json && Array.isArray(json.errors) && json.errors.length > 0) {
                    throw new Error('move failed');
                }
            }
            clearSelection();
            router.refresh();
        } catch  {
            toast.error(t('error:unknown'));
        } finally{
            setBusy(false);
        }
    };
    const handleDragEnd = (event)=>{
        const active = activeItem;
        setActiveItem(null);
        if (!active || !event.over) return;
        const overId = String(event.over.id);
        let target;
        if (overId === DROP_ROOT) {
            target = null;
        } else if (overId.startsWith('crumb:')) {
            target = overId.slice('crumb:'.length);
        } else if (overId.startsWith('folder:')) {
            target = overId.slice('folder:'.length);
        } else {
            return;
        }
        // Dragging a selected item moves the whole selection; dragging an
        // unselected item moves just that item.
        const itemsToMove = (selected.has(active.itemKey) ? [
            ...selected
        ].map((k)=>itemByKey.get(k)).filter(Boolean) : [
            active
        ]).filter(// Drop the target folder itself from the batch (no-op / would self-nest).
        (it)=>!(it.relationTo === foldersSlug && String(it.value.id) === String(target)));
        void moveItems(itemsToMove, target);
    };
    const isEmpty = subfolders.length === 0 && documents.length === 0;
    return /*#__PURE__*/ _jsxs(DndContext, {
        sensors: sensors,
        onDragStart: (e)=>setActiveItem(itemByKey.get(String(e.active.id)) ?? null),
        onDragCancel: ()=>setActiveItem(null),
        onDragEnd: handleDragEnd,
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "twp space-y-4",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex items-center justify-between gap-2",
                        children: [
                            /*#__PURE__*/ _jsx(Breadcrumbs, {
                                rootLabel: rootLabel,
                                breadcrumbs: breadcrumbs,
                                currentFolderID: currentFolderID,
                                onNavigate: navTo
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    selectMode && selected.size > 0 && /*#__PURE__*/ _jsxs(_Fragment, {
                                        children: [
                                            /*#__PURE__*/ _jsxs("span", {
                                                className: "text-sm text-muted-foreground",
                                                children: [
                                                    selected.size,
                                                    " selected"
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsx(Button, {
                                                size: "sm",
                                                variant: "ghost",
                                                onClick: clearSelection,
                                                disabled: busy,
                                                children: t('general:clear') || 'Clear'
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs(Button, {
                                        size: "sm",
                                        variant: selectMode ? 'secondary' : 'outline',
                                        onClick: toggleSelectMode,
                                        disabled: busy,
                                        "aria-pressed": selectMode,
                                        children: [
                                            /*#__PURE__*/ _jsx(CheckSquare, {
                                                className: "mr-2 h-4 w-4"
                                            }),
                                            selectMode ? 'Done' : 'Select'
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs(Button, {
                                        size: "sm",
                                        onClick: ()=>setNewOpen(true),
                                        disabled: busy,
                                        children: [
                                            /*#__PURE__*/ _jsx(FolderPlus, {
                                                className: "mr-2 h-4 w-4"
                                            }),
                                            t('folder:newFolder')
                                        ]
                                    })
                                ]
                            })
                        ]
                    }),
                    isEmpty ? /*#__PURE__*/ _jsx("p", {
                        className: "py-12 text-center text-sm text-muted-foreground",
                        children: "This folder is empty."
                    }) : /*#__PURE__*/ _jsxs("div", {
                        className: "space-y-6",
                        children: [
                            subfolders.length > 0 && /*#__PURE__*/ _jsxs("section", {
                                className: "space-y-2",
                                children: [
                                    /*#__PURE__*/ _jsx("h3", {
                                        className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
                                        children: t('folder:folders') || 'Folders'
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
                                        children: subfolders.map((item)=>/*#__PURE__*/ _jsx(FolderCard, {
                                                item: item,
                                                selected: selected.has(item.itemKey),
                                                selectMode: selectMode,
                                                onActivate: handleActivate,
                                                onRename: ()=>{
                                                    setRenameTarget(item);
                                                    setRenameName(item.value._folderOrDocumentTitle);
                                                },
                                                onDelete: ()=>deleteFolder(item),
                                                renameLabel: t('general:rename'),
                                                deleteLabel: t('general:delete')
                                            }, item.itemKey))
                                    })
                                ]
                            }),
                            documents.length > 0 && /*#__PURE__*/ _jsxs("section", {
                                className: "space-y-2",
                                children: [
                                    /*#__PURE__*/ _jsx("h3", {
                                        className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
                                        children: t('general:documents') || 'Documents'
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
                                        children: documents.map((item)=>/*#__PURE__*/ _jsx(DocCard, {
                                                item: item,
                                                selected: selected.has(item.itemKey),
                                                selectMode: selectMode,
                                                onActivate: handleActivate
                                            }, item.itemKey))
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(DragOverlay, {
                children: activeItem ? /*#__PURE__*/ _jsxs("div", {
                    className: "flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-lg",
                    children: [
                        activeItem.relationTo === foldersSlug ? /*#__PURE__*/ _jsx(Folder, {
                            className: "h-4 w-4"
                        }) : /*#__PURE__*/ _jsx(FileIcon, {
                            className: "h-4 w-4"
                        }),
                        selected.has(activeItem.itemKey) && selected.size > 1 ? `${selected.size} items` : activeItem.value._folderOrDocumentTitle
                    ]
                }) : null
            }),
            /*#__PURE__*/ _jsx(Dialog, {
                open: newOpen,
                onOpenChange: setNewOpen,
                children: /*#__PURE__*/ _jsxs(DialogContent, {
                    className: "twp",
                    children: [
                        /*#__PURE__*/ _jsx(DialogHeader, {
                            children: /*#__PURE__*/ _jsx(DialogTitle, {
                                children: t('folder:newFolder')
                            })
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "space-y-2",
                            children: [
                                /*#__PURE__*/ _jsx(Label, {
                                    htmlFor: "shadcn-new-folder-name",
                                    children: t('folder:folderName')
                                }),
                                /*#__PURE__*/ _jsx(Input, {
                                    id: "shadcn-new-folder-name",
                                    value: newName,
                                    autoFocus: true,
                                    onChange: (e)=>setNewName(e.target.value),
                                    onKeyDown: (e)=>{
                                        if (e.key === 'Enter') void createFolder();
                                    }
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs(DialogFooter, {
                            children: [
                                /*#__PURE__*/ _jsx(Button, {
                                    variant: "outline",
                                    size: "sm",
                                    onClick: ()=>setNewOpen(false),
                                    disabled: busy,
                                    children: t('general:cancel')
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    size: "sm",
                                    onClick: ()=>void createFolder(),
                                    disabled: busy || !newName.trim(),
                                    children: t('general:create')
                                })
                            ]
                        })
                    ]
                })
            }),
            /*#__PURE__*/ _jsx(Dialog, {
                open: Boolean(renameTarget),
                onOpenChange: (o)=>!o && setRenameTarget(null),
                children: /*#__PURE__*/ _jsxs(DialogContent, {
                    className: "twp",
                    children: [
                        /*#__PURE__*/ _jsx(DialogHeader, {
                            children: /*#__PURE__*/ _jsx(DialogTitle, {
                                children: t('folder:renameFolder')
                            })
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "space-y-2",
                            children: [
                                /*#__PURE__*/ _jsx(Label, {
                                    htmlFor: "shadcn-rename-folder-name",
                                    children: t('folder:folderName')
                                }),
                                /*#__PURE__*/ _jsx(Input, {
                                    id: "shadcn-rename-folder-name",
                                    value: renameName,
                                    autoFocus: true,
                                    onChange: (e)=>setRenameName(e.target.value),
                                    onKeyDown: (e)=>{
                                        if (e.key === 'Enter') void renameFolder();
                                    }
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs(DialogFooter, {
                            children: [
                                /*#__PURE__*/ _jsx(Button, {
                                    variant: "outline",
                                    size: "sm",
                                    onClick: ()=>setRenameTarget(null),
                                    disabled: busy,
                                    children: t('general:cancel')
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    size: "sm",
                                    onClick: ()=>void renameFolder(),
                                    disabled: busy || !renameName.trim(),
                                    children: t('general:save')
                                })
                            ]
                        })
                    ]
                })
            })
        ]
    });
}

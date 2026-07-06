'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* The two grid-card presentational components (a folder, or a linked
   document) rendered by FolderBrowserClient. Each is simultaneously a
   dnd-kit draggable (and, for folders, a droppable) — drag/drop wiring and
   selection state live in the parent; these only render + report clicks. */ import * as React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { File as FileIcon, Folder, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from 'payload-plugin-shadcn-ui';
import { Card } from 'payload-plugin-shadcn-ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
export function FolderCard({ item, selected, selectMode, onActivate, onRename, onDelete, renameLabel, deleteLabel }) {
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: `folder:${item.value.id}`
    });
    const { setNodeRef: setDragRef, listeners, attributes, isDragging } = useDraggable({
        id: item.itemKey
    });
    return /*#__PURE__*/ _jsxs(Card, {
        ref: (node)=>{
            setDropRef(node);
            setDragRef(node);
        },
        ...attributes,
        ...listeners,
        role: "button",
        tabIndex: 0,
        "aria-pressed": selectMode ? selected : undefined,
        onClick: (e)=>onActivate(item, {
                shiftKey: e.shiftKey
            }),
        onKeyDown: (e)=>{
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivate(item, {
                    shiftKey: e.shiftKey
                });
            }
        },
        className: cn('relative flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-accent', isOver && 'bg-primary/10 ring-2 ring-primary', selected && 'ring-2 ring-primary', isDragging && 'opacity-40'),
        children: [
            /*#__PURE__*/ _jsx(Folder, {
                className: "h-8 w-8 shrink-0 text-muted-foreground"
            }),
            /*#__PURE__*/ _jsx("span", {
                className: "truncate text-sm",
                children: item.value._folderOrDocumentTitle
            }),
            /*#__PURE__*/ _jsxs(DropdownMenu, {
                children: [
                    /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                        asChild: true,
                        onClick: (e)=>e.stopPropagation(),
                        children: /*#__PURE__*/ _jsx(Button, {
                            variant: "ghost",
                            size: "icon",
                            className: "ml-auto h-7 w-7 shrink-0",
                            onPointerDown: (e)=>e.stopPropagation(),
                            children: /*#__PURE__*/ _jsx(MoreVertical, {
                                className: "h-4 w-4"
                            })
                        })
                    }),
                    /*#__PURE__*/ _jsxs(DropdownMenuContent, {
                        align: "end",
                        onClick: (e)=>e.stopPropagation(),
                        children: [
                            /*#__PURE__*/ _jsxs(DropdownMenuItem, {
                                onSelect: ()=>onRename(),
                                children: [
                                    /*#__PURE__*/ _jsx(Pencil, {
                                        className: "mr-2 h-4 w-4"
                                    }),
                                    renameLabel
                                ]
                            }),
                            /*#__PURE__*/ _jsxs(DropdownMenuItem, {
                                onSelect: ()=>onDelete(),
                                className: "text-destructive",
                                children: [
                                    /*#__PURE__*/ _jsx(Trash2, {
                                        className: "mr-2 h-4 w-4"
                                    }),
                                    deleteLabel
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}
export function DocCard({ item, selected, selectMode, onActivate }) {
    const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
        id: item.itemKey
    });
    const { url, filename, _folderOrDocumentTitle } = item.value;
    return /*#__PURE__*/ _jsxs(Card, {
        ref: setNodeRef,
        ...attributes,
        ...listeners,
        role: "button",
        tabIndex: 0,
        "aria-pressed": selectMode ? selected : undefined,
        onClick: (e)=>onActivate(item, {
                shiftKey: e.shiftKey
            }),
        onKeyDown: (e)=>{
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivate(item, {
                    shiftKey: e.shiftKey
                });
            }
        },
        className: cn('flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-accent', selected && 'ring-2 ring-primary', isDragging && 'opacity-40'),
        children: [
            url ? // eslint-disable-next-line @next/next/no-img-element
            /*#__PURE__*/ _jsx("img", {
                src: url,
                alt: filename ?? '',
                className: "h-8 w-8 shrink-0 rounded object-cover"
            }) : /*#__PURE__*/ _jsx(FileIcon, {
                className: "h-8 w-8 shrink-0 text-muted-foreground"
            }),
            /*#__PURE__*/ _jsx("span", {
                className: "truncate text-sm",
                children: _folderOrDocumentTitle
            })
        ]
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Folder path breadcrumb nav, with each crumb (and the root) acting as a
   dnd-kit drop target so dragging an item onto a crumb moves it there. Split
   out of FolderBrowserClient.tsx, which owns the drag/drop + navigation
   state this renders into. */ import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from 'payload-plugin-shadcn-ui';
export const DROP_ROOT = 'crumb:__root__';
export function Breadcrumbs({ rootLabel, breadcrumbs, currentFolderID, onNavigate }) {
    return /*#__PURE__*/ _jsxs("nav", {
        className: "flex flex-wrap items-center gap-1 text-sm text-muted-foreground",
        children: [
            /*#__PURE__*/ _jsx(CrumbDropTarget, {
                id: DROP_ROOT,
                children: /*#__PURE__*/ _jsxs("button", {
                    type: "button",
                    onClick: ()=>onNavigate(null),
                    className: cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground', currentFolderID == null && 'text-foreground'),
                    children: [
                        /*#__PURE__*/ _jsx(Home, {
                            className: "h-3.5 w-3.5"
                        }),
                        rootLabel
                    ]
                })
            }),
            breadcrumbs.map((crumb, i)=>{
                const isLast = i === breadcrumbs.length - 1;
                return /*#__PURE__*/ _jsxs(React.Fragment, {
                    children: [
                        /*#__PURE__*/ _jsx(ChevronRight, {
                            className: "h-3.5 w-3.5 opacity-50"
                        }),
                        isLast ? /*#__PURE__*/ _jsx("span", {
                            className: "px-1.5 py-0.5 font-medium text-foreground",
                            children: crumb.name
                        }) : /*#__PURE__*/ _jsx(CrumbDropTarget, {
                            id: `crumb:${crumb.id}`,
                            children: /*#__PURE__*/ _jsx("button", {
                                type: "button",
                                onClick: ()=>onNavigate(crumb.id),
                                className: "rounded px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground",
                                children: crumb.name
                            })
                        })
                    ]
                }, crumb.id);
            })
        ]
    });
}
function CrumbDropTarget({ id, children }) {
    const { setNodeRef, isOver } = useDroppable({
        id
    });
    return /*#__PURE__*/ _jsx("span", {
        ref: setNodeRef,
        className: cn('rounded', isOver && 'bg-primary/20 ring-1 ring-primary'),
        children: children
    });
}

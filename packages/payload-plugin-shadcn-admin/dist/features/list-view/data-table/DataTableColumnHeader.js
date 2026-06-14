'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff, GripVertical } from 'lucide-react';
import { Button } from 'payload-plugin-shadcn-ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { SortableHandleContext } from './DataTable.js';
function DragHandle() {
    const ctx = React.useContext(SortableHandleContext);
    if (!ctx) return null;
    return /*#__PURE__*/ _jsx("button", {
        type: "button",
        "aria-label": "Reorder column",
        className: cn('ml-auto inline-flex h-6 w-4 shrink-0 items-center justify-center text-muted-foreground/50', 'opacity-0 transition-opacity group-hover/th:opacity-100', 'hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', ctx.isDragging ? 'cursor-grabbing opacity-100' : 'cursor-grab'),
        style: {
            touchAction: 'none'
        },
        ...ctx.attributes,
        ...ctx.listeners,
        children: /*#__PURE__*/ _jsx(GripVertical, {
            className: "h-3.5 w-3.5"
        })
    });
}
export function DataTableColumnHeader({ column, title, className }) {
    if (!column.getCanSort() && !column.getCanHide()) {
        return /*#__PURE__*/ _jsxs("div", {
            className: cn('flex items-center', className),
            children: [
                /*#__PURE__*/ _jsx("span", {
                    children: title
                }),
                /*#__PURE__*/ _jsx(DragHandle, {})
            ]
        });
    }
    const sorted = column.getIsSorted();
    return /*#__PURE__*/ _jsxs("div", {
        className: cn('flex items-center', className),
        children: [
            /*#__PURE__*/ _jsxs(DropdownMenu, {
                children: [
                    /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsxs(Button, {
                            variant: "ghost",
                            size: "sm",
                            className: cn('-ml-3 h-8 text-xs font-medium tracking-wide text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground', sorted && 'text-foreground'),
                            children: [
                                /*#__PURE__*/ _jsx("span", {
                                    children: title
                                }),
                                sorted === 'desc' ? /*#__PURE__*/ _jsx(ArrowDown, {
                                    className: "ml-2 h-4 w-4"
                                }) : sorted === 'asc' ? /*#__PURE__*/ _jsx(ArrowUp, {
                                    className: "ml-2 h-4 w-4"
                                }) : /*#__PURE__*/ _jsx(ChevronsUpDown, {
                                    className: "ml-2 h-4 w-4 opacity-0 transition-opacity group-hover/th:opacity-100"
                                })
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsxs(DropdownMenuContent, {
                        align: "start",
                        children: [
                            column.getCanSort() && /*#__PURE__*/ _jsxs(_Fragment, {
                                children: [
                                    /*#__PURE__*/ _jsxs(DropdownMenuItem, {
                                        onClick: ()=>column.toggleSorting(false),
                                        children: [
                                            /*#__PURE__*/ _jsx(ArrowUp, {
                                                className: "mr-2 h-3.5 w-3.5 text-muted-foreground/70"
                                            }),
                                            "Asc"
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs(DropdownMenuItem, {
                                        onClick: ()=>column.toggleSorting(true),
                                        children: [
                                            /*#__PURE__*/ _jsx(ArrowDown, {
                                                className: "mr-2 h-3.5 w-3.5 text-muted-foreground/70"
                                            }),
                                            "Desc"
                                        ]
                                    })
                                ]
                            }),
                            column.getCanSort() && column.getCanHide() && /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                            column.getCanHide() && /*#__PURE__*/ _jsxs(DropdownMenuItem, {
                                onClick: ()=>column.toggleVisibility(false),
                                children: [
                                    /*#__PURE__*/ _jsx(EyeOff, {
                                        className: "mr-2 h-3.5 w-3.5 text-muted-foreground/70"
                                    }),
                                    "Hide"
                                ]
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(DragHandle, {})
        ]
    });
}

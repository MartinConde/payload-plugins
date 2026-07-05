'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Client shell for the dashboard: takes server-rendered widget content (each
   widget is an RSC-produced React node — see AutoDashboardView) and makes the
   grid drag-to-reorder, resizable (1/2/full-width columns), and hideable, all
   dnd-kit sensors/handle patterns mirroring GalleryArrayInput. Layout persists
   per-user via useDashboardLayoutPrefs.

   Widgets are passed in as pre-rendered nodes rather than re-rendered here —
   this is the standard "Server Component as children of a Client Component"
   pattern, so widget content keeps doing server-side data fetching (payload.find,
   payload.count) without this file needing to be a server component itself. */ import * as React from 'react';
import { Columns2Icon, EyeOffIcon, GripVerticalIcon, PlusIcon } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from 'payload-plugin-shadcn-ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { useTranslation } from '../../internal/payloadAdapter.js';
import { useDashboardLayoutPrefs } from './prefs/useDashboardLayoutPrefs.js';
const DEFAULT_SIZE = 'full';
const SIZE_KEYS = {
    sm: 'shadcnAdmin:widgetSizeSmall',
    md: 'shadcnAdmin:widgetSizeMedium',
    full: 'shadcnAdmin:widgetSizeFull'
};
const SIZE_COLSPAN = {
    sm: 'col-span-1',
    md: 'col-span-1 sm:col-span-2',
    full: 'col-span-1 sm:col-span-2 lg:col-span-3'
};
export function DashboardGrid({ widgets }) {
    const { t } = useTranslation();
    const { order: storedOrder, hidden, sizes, loaded, setOrder, setHidden, setSize } = useDashboardLayoutPrefs();
    const defaultOrder = React.useMemo(()=>widgets.map((w)=>w.id), [
        widgets
    ]);
    const byId = React.useMemo(()=>new Map(widgets.map((w)=>[
                w.id,
                w
            ])), [
        widgets
    ]);
    const hiddenSet = React.useMemo(()=>new Set(hidden), [
        hidden
    ]);
    // Reconcile the persisted order against the current widget set: keep known
    // ids in their saved order, append any new widget ids at the end, drop ids
    // for widgets that no longer exist.
    const order = React.useMemo(()=>{
        if (!loaded || !storedOrder) return defaultOrder;
        const known = storedOrder.filter((id)=>byId.has(id));
        const missing = defaultOrder.filter((id)=>!known.includes(id));
        return [
            ...known,
            ...missing
        ];
    }, [
        loaded,
        storedOrder,
        byId,
        defaultOrder
    ]);
    const visibleOrder = React.useMemo(()=>order.filter((id)=>!hiddenSet.has(id)), [
        order,
        hiddenSet
    ]);
    const hiddenWidgets = React.useMemo(()=>order.filter((id)=>hiddenSet.has(id)).map((id)=>byId.get(id)), [
        order,
        hiddenSet,
        byId
    ]);
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 4
        }
    }), useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates
    }));
    const handleDragEnd = (event)=>{
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = order.indexOf(String(active.id));
        const newIndex = order.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;
        setOrder(arrayMove(order, oldIndex, newIndex));
    };
    if (widgets.length === 0) return null;
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-4",
        children: [
            hiddenWidgets.length > 0 && /*#__PURE__*/ _jsx("div", {
                className: "flex justify-end",
                children: /*#__PURE__*/ _jsxs(DropdownMenu, {
                    children: [
                        /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                            asChild: true,
                            children: /*#__PURE__*/ _jsxs(Button, {
                                variant: "outline",
                                size: "sm",
                                children: [
                                    /*#__PURE__*/ _jsx(PlusIcon, {
                                        className: "size-4"
                                    }),
                                    t('shadcnAdmin:addWidget')
                                ]
                            })
                        }),
                        /*#__PURE__*/ _jsxs(DropdownMenuContent, {
                            align: "end",
                            children: [
                                /*#__PURE__*/ _jsx(DropdownMenuLabel, {
                                    children: t('shadcnAdmin:hiddenWidgets')
                                }),
                                /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                                hiddenWidgets.map((widget)=>/*#__PURE__*/ _jsx(DropdownMenuItem, {
                                        onSelect: ()=>setHidden(hidden.filter((id)=>id !== widget.id)),
                                        children: widget.label
                                    }, widget.id))
                            ]
                        })
                    ]
                })
            }),
            visibleOrder.length > 0 && /*#__PURE__*/ _jsx(DndContext, {
                sensors: sensors,
                collisionDetection: closestCenter,
                onDragEnd: handleDragEnd,
                children: /*#__PURE__*/ _jsx(SortableContext, {
                    items: visibleOrder,
                    strategy: rectSortingStrategy,
                    children: /*#__PURE__*/ _jsx("div", {
                        className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
                        children: visibleOrder.map((id)=>{
                            const widget = byId.get(id);
                            if (!widget) return null;
                            return /*#__PURE__*/ _jsx(SortableWidget, {
                                id: id,
                                label: widget.label,
                                size: sizes[id] ?? DEFAULT_SIZE,
                                onSizeChange: (size)=>setSize(id, size),
                                onHide: ()=>setHidden([
                                        ...hidden,
                                        id
                                    ]),
                                t: t,
                                children: widget.node
                            }, id);
                        })
                    })
                })
            })
        ]
    });
}
function SortableWidget({ id, label, size, onSizeChange, onHide, t, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id
    });
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined
    };
    return /*#__PURE__*/ _jsxs("div", {
        ref: setNodeRef,
        style: style,
        className: cn('group relative', SIZE_COLSPAN[size], isDragging && 'z-10'),
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: cn('absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-background/80 p-0.5 shadow-sm backdrop-blur', 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'),
                children: [
                    /*#__PURE__*/ _jsxs(DropdownMenu, {
                        children: [
                            /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                                asChild: true,
                                children: /*#__PURE__*/ _jsx("button", {
                                    type: "button",
                                    className: "flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground",
                                    "aria-label": t('shadcnAdmin:resizeWidget', {
                                        label
                                    }),
                                    children: /*#__PURE__*/ _jsx(Columns2Icon, {
                                        className: "size-4"
                                    })
                                })
                            }),
                            /*#__PURE__*/ _jsxs(DropdownMenuContent, {
                                align: "end",
                                children: [
                                    /*#__PURE__*/ _jsx(DropdownMenuLabel, {
                                        children: t('shadcnAdmin:widgetWidth')
                                    }),
                                    /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                                    /*#__PURE__*/ _jsx(DropdownMenuRadioGroup, {
                                        value: size,
                                        onValueChange: (value)=>onSizeChange(value),
                                        children: Object.keys(SIZE_KEYS).map((key)=>/*#__PURE__*/ _jsx(DropdownMenuRadioItem, {
                                                value: key,
                                                children: t(SIZE_KEYS[key])
                                            }, key))
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsx("button", {
                        type: "button",
                        onClick: onHide,
                        className: "flex size-6 items-center justify-center rounded text-muted-foreground hover:text-destructive",
                        "aria-label": t('shadcnAdmin:hideWidget', {
                            label
                        }),
                        children: /*#__PURE__*/ _jsx(EyeOffIcon, {
                            className: "size-4"
                        })
                    }),
                    /*#__PURE__*/ _jsx("button", {
                        type: "button",
                        ...attributes,
                        ...listeners,
                        className: "flex size-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground",
                        "aria-label": t('shadcnAdmin:dragToReorder'),
                        children: /*#__PURE__*/ _jsx(GripVerticalIcon, {
                            className: "size-4"
                        })
                    })
                ]
            }),
            children
        ]
    });
}

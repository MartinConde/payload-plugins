'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Array field input. Payload stores arrays as [{ id, ...subfields }] on disk
   and REST PATCH replaces the entire array (no per-row partial updates), so
   this input always emits the full next-array via onChange. The bridge
   serializes the whole array to the wire when any row's subfield is dirty.

   Each row is a shadcn-styled card with a drag handle (dnd-kit), delete
   button, and the row's subfields rendered via the bridge's renderChild
   callback (which dispatches each subfield back through FieldInput, allowing
   nested arrays/blocks/group/tabs to recurse). */ import * as React from 'react';
import { GripVerticalIcon, TrashIcon, PlusIcon } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Card, CardContent } from 'payload-plugin-shadcn-ui';
const ensureRowId = (row)=>{
    const id = typeof row.id === 'string' ? row.id : typeof row.id === 'number' ? String(row.id) : globalThis.crypto?.randomUUID?.() ?? `row-${Math.random().toString(36).slice(2, 10)}`;
    return {
        ...row,
        id
    };
};
const seedRowDefaults = (subfields)=>{
    const row = {
        id: globalThis.crypto?.randomUUID?.() ?? `row-${Math.random().toString(36).slice(2, 10)}`
    };
    for (const sub of subfields){
        if (!sub.name) continue;
        if (sub.defaultValue !== undefined) row[sub.name] = sub.defaultValue;
    }
    return row;
};
export function ArrayInput({ id, field, value, onChange, nestedPath, renderChild, disabled, rowPerms }) {
    const { t } = useTranslation();
    const subfields = field.fields ?? [];
    const rows = React.useMemo(()=>{
        if (!Array.isArray(value)) return [];
        return value.map((r)=>r && typeof r === 'object' ? ensureRowId(r) : ensureRowId({}));
    }, [
        value
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
        const oldIndex = rows.findIndex((r)=>r.id === active.id);
        const newIndex = rows.findIndex((r)=>r.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        onChange(arrayMove(rows, oldIndex, newIndex));
    };
    const addRow = ()=>{
        onChange([
            ...rows,
            seedRowDefaults(subfields)
        ]);
    };
    const removeRow = (rowId)=>{
        onChange(rows.filter((r)=>r.id !== rowId));
    };
    return /*#__PURE__*/ _jsxs("div", {
        id: id,
        className: "flex flex-col gap-2",
        children: [
            rows.length === 0 ? /*#__PURE__*/ _jsx("p", {
                className: "text-xs text-muted-foreground",
                children: "No rows."
            }) : /*#__PURE__*/ _jsx(DndContext, {
                sensors: sensors,
                collisionDetection: closestCenter,
                modifiers: [
                    restrictToVerticalAxis
                ],
                onDragEnd: handleDragEnd,
                children: /*#__PURE__*/ _jsx(SortableContext, {
                    items: rows.map((r)=>r.id),
                    strategy: verticalListSortingStrategy,
                    children: /*#__PURE__*/ _jsx("div", {
                        className: "flex flex-col gap-2",
                        children: rows.map((row, idx)=>/*#__PURE__*/ _jsx(SortableRow, {
                                row: row,
                                index: idx,
                                disabled: disabled,
                                onRemove: ()=>removeRow(row.id),
                                children: subfields.map((sub)=>// Cascade the array's `disabled` to its row subfields so
                                    // their inputs are disabled too (not just add/remove/
                                    // reorder). `disabled` here covers both readOnly fields and
                                    // the form-wide submitting state — children should be
                                    // non-editable in either case.
                                    renderChild(sub, `${nestedPath}.${idx}.`, rowPerms, disabled))
                            }, row.id))
                    })
                })
            }),
            /*#__PURE__*/ _jsxs(Button, {
                type: "button",
                variant: "outline",
                size: "sm",
                onClick: addRow,
                disabled: disabled,
                className: "self-start",
                children: [
                    /*#__PURE__*/ _jsx(PlusIcon, {
                        className: "size-3"
                    }),
                    t('shadcnAdmin:addRow')
                ]
            })
        ]
    });
}
function SortableRow({ row, index, disabled, onRemove, children, header }) {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: row.id
    });
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined
    };
    return /*#__PURE__*/ _jsx(Card, {
        ref: setNodeRef,
        style: style,
        children: /*#__PURE__*/ _jsxs(CardContent, {
            className: "flex flex-row items-stretch gap-2 p-2",
            children: [
                /*#__PURE__*/ _jsx("button", {
                    type: "button",
                    ...attributes,
                    ...listeners,
                    disabled: disabled,
                    className: "flex shrink-0 cursor-grab items-start pt-2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                    "aria-label": t('shadcnAdmin:dragToReorder'),
                    children: /*#__PURE__*/ _jsx(GripVerticalIcon, {
                        className: "size-4"
                    })
                }),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-1 flex-col gap-3",
                    children: [
                        /*#__PURE__*/ _jsxs("div", {
                            className: "flex items-center justify-between text-xs text-muted-foreground",
                            children: [
                                /*#__PURE__*/ _jsxs("span", {
                                    children: [
                                        "#",
                                        index + 1
                                    ]
                                }),
                                header
                            ]
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "flex flex-col gap-3",
                            children: children
                        })
                    ]
                }),
                /*#__PURE__*/ _jsx("button", {
                    type: "button",
                    onClick: onRemove,
                    disabled: disabled,
                    className: "flex shrink-0 cursor-pointer items-start pt-2 text-muted-foreground hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50",
                    "aria-label": t('shadcnAdmin:removeRow'),
                    children: /*#__PURE__*/ _jsx(TrashIcon, {
                        className: "size-4"
                    })
                })
            ]
        })
    });
}
export { SortableRow };

'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Blocks field input. Payload stores blocks as [{ id, blockType, ...subfields }]
   on disk and REST PATCH replaces the entire blocks array (same as array — no
   per-row partial). Each row's blockType picks which of field.blocks[] to
   render its subfields from. */ import * as React from 'react';
import { PlusIcon } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { Badge } from 'payload-plugin-shadcn-ui';
import { SortableRow } from './ArrayInput.js';
const newRow = (block)=>{
    const row = {
        id: globalThis.crypto?.randomUUID?.() ?? `block-${Math.random().toString(36).slice(2, 10)}`,
        blockType: block.slug
    };
    for (const sub of block.fields){
        if (!sub.name) continue;
        if (sub.defaultValue !== undefined) row[sub.name] = sub.defaultValue;
    }
    return row;
};
const ensureRowId = (row)=>{
    const id = typeof row.id === 'string' ? row.id : typeof row.id === 'number' ? String(row.id) : globalThis.crypto?.randomUUID?.() ?? `block-${Math.random().toString(36).slice(2, 10)}`;
    return {
        ...row,
        id,
        blockType: typeof row.blockType === 'string' ? row.blockType : ''
    };
};
const blockLabelOf = (block)=>{
    if (block.labels?.singular && block.labels.singular.length > 0) return block.labels.singular;
    return block.slug;
};
export function BlocksInput({ id, field, value, onChange, nestedPath, renderChild, disabled, blockPerms }) {
    const { t } = useTranslation();
    const blocks = field.blocks ?? [];
    const rows = React.useMemo(()=>{
        if (!Array.isArray(value)) return [];
        return value.map((r)=>r && typeof r === 'object' ? ensureRowId(r) : ensureRowId({}));
    }, [
        value
    ]);
    const blockBySlug = React.useMemo(()=>{
        const out = {};
        for (const b of blocks)out[b.slug] = b;
        return out;
    }, [
        blocks
    ]);
    const [pickerSlug, setPickerSlug] = React.useState(blocks[0]?.slug ?? '');
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
    const addBlock = ()=>{
        const block = blockBySlug[pickerSlug];
        if (!block) return;
        onChange([
            ...rows,
            newRow(block)
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
                children: t('shadcnAdmin:noBlocks')
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
                        children: rows.map((row, idx)=>{
                            const block = blockBySlug[row.blockType];
                            return /*#__PURE__*/ _jsx(SortableRow, {
                                row: row,
                                index: idx,
                                disabled: disabled,
                                onRemove: ()=>removeRow(row.id),
                                header: /*#__PURE__*/ _jsx(Badge, {
                                    variant: "outline",
                                    className: "text-[10px] uppercase",
                                    children: block ? blockLabelOf(block) : row.blockType || 'Unknown'
                                }),
                                children: block ? block.fields.map((sub)=>{
                                    // Per-block sub-perms: blocks[slug].fields gates
                                    // each block's subfields independently.
                                    const perBlockPerms = blockPerms ? blockPerms.blocks?.[row.blockType] : undefined;
                                    return renderChild(sub, `${nestedPath}.${idx}.`, perBlockPerms, // Cascade a read-only/disabled blocks field to its
                                    // block subfields (see ArrayInput for rationale).
                                    disabled);
                                }) : null
                            }, row.id);
                        })
                    })
                })
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-row items-center gap-2",
                children: [
                    /*#__PURE__*/ _jsxs(Select, {
                        value: pickerSlug,
                        onValueChange: (next)=>setPickerSlug(next),
                        disabled: disabled || blocks.length === 0,
                        children: [
                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                className: "w-44",
                                children: /*#__PURE__*/ _jsx(SelectValue, {
                                    placeholder: "Block type…"
                                })
                            }),
                            /*#__PURE__*/ _jsx(SelectContent, {
                                children: blocks.map((b)=>/*#__PURE__*/ _jsx(SelectItem, {
                                        value: b.slug,
                                        children: blockLabelOf(b)
                                    }, b.slug))
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs(Button, {
                        type: "button",
                        variant: "outline",
                        size: "sm",
                        onClick: addBlock,
                        disabled: disabled || !pickerSlug,
                        children: [
                            /*#__PURE__*/ _jsx(PlusIcon, {
                                className: "size-3"
                            }),
                            t('shadcnAdmin:addBlock')
                        ]
                    })
                ]
            })
        ]
    });
}

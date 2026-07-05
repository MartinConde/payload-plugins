'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Dedicated per-block editing panel for the Live Preview page-builder layer.
   Selecting a block in the preview (click, or the floating toolbar) shows
   ONLY that block's fields here instead of scrolling the main form to it —
   the "focused settings panel" tier of the feature (see LIVE-PREVIEW.md).

   Reuses the bridge's own field-tree recursion (`renderChild`, from
   `makeFieldTreeRenderer`) with the EXACT pattern `BlocksInput` already uses
   to render a block row's subfields (`block.fields.map(sub => renderChild(sub,
   `${nestedPath}.${idx}.`, perBlockPerms, disabled))`) — this is not a second
   field-rendering implementation, just that same call site pointed at one
   row instead of all of them.

   Every row's field group stays MOUNTED, toggled with a plain `hidden` class
   rather than a conditional return — switching the selection then causes
   zero remount (collapsed `SortableRow`s in the main `BlocksInput` already
   establish this "hidden but mounted" precedent via a `0fr/1fr` grid; a
   simple `display:none` here is equivalent and needs no transition). This
   matters because `RichTextInput` reseeds its editor state on remount — fine
   for an occasional flash, not something we want on every block click. */ import * as React from 'react';
import { Badge, usePageBuilder } from 'payload-plugin-shadcn-ui';
const blockLabelOf = (block)=>{
    if (block.labels?.singular && block.labels.singular.length > 0) return block.labels.singular;
    return block.slug;
};
export function BlockSettingsPanel({ rows, blocks, layoutBasePath, renderChild, blockPerms, disabled }) {
    const { selectedBlockId } = usePageBuilder();
    const blockBySlug = React.useMemo(()=>{
        const out = {};
        for (const b of blocks)out[b.slug] = b;
        return out;
    }, [
        blocks
    ]);
    const selectedRow = rows.find((r)=>r.id === selectedBlockId);
    const selectedBlock = selectedRow ? blockBySlug[selectedRow.blockType] : undefined;
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex h-full flex-col gap-4 overflow-y-auto p-4",
        children: [
            selectedRow ? /*#__PURE__*/ _jsx("div", {
                className: "flex items-center gap-2 border-b pb-3",
                children: /*#__PURE__*/ _jsx(Badge, {
                    variant: "outline",
                    className: "text-[10px] uppercase",
                    children: selectedBlock ? blockLabelOf(selectedBlock) : selectedRow.blockType || 'Unknown'
                })
            }) : null,
            rows.map((row, idx)=>{
                const block = blockBySlug[row.blockType];
                if (!block) return null;
                const perBlockPerms = blockPerms ? blockPerms.blocks?.[row.blockType] : undefined;
                return /*#__PURE__*/ _jsx("div", {
                    className: row.id === selectedBlockId ? 'flex flex-col gap-4' : 'hidden',
                    children: block.fields.map((sub)=>renderChild(sub, `${layoutBasePath}.${idx}.`, perBlockPerms, disabled))
                }, row.id);
            })
        ]
    });
}

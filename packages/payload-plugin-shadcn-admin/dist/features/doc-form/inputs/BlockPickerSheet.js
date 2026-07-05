'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Visual block-type picker for `blocks` fields, styled after Payload's
   default block-selection drawer: a right-side Sheet with a search box and
   a thumbnail grid (falling back to a generic icon when a block has no
   `admin.images.thumbnail`). Blocks carrying `admin.group` are rendered
   under labeled sections, matching Payload's grouped block drawer; ungrouped
   blocks render first with no heading. */ import * as React from 'react';
import { BlocksIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapterUI.js';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
const blockLabelOf = (block)=>{
    if (block.labels?.singular && block.labels.singular.length > 0) return block.labels.singular;
    return block.slug;
};
const groupBlocks = (blocks)=>{
    const ungrouped = [];
    const grouped = new Map();
    for (const block of blocks){
        if (block.group) {
            const list = grouped.get(block.group) ?? [];
            list.push(block);
            grouped.set(block.group, list);
        } else {
            ungrouped.push(block);
        }
    }
    const sections = [];
    if (ungrouped.length > 0) sections.push({
        heading: null,
        blocks: ungrouped
    });
    for (const [heading, list] of grouped)sections.push({
        heading,
        blocks: list
    });
    return sections;
};
export function BlockPickerSheet({ open, onOpenChange, blocks, onSelect }) {
    const { t } = useTranslation();
    const [search, setSearch] = React.useState('');
    React.useEffect(()=>{
        if (open) setSearch('');
    }, [
        open
    ]);
    const filtered = React.useMemo(()=>{
        const term = search.trim().toLowerCase();
        if (!term) return blocks;
        return blocks.filter((b)=>blockLabelOf(b).toLowerCase().includes(term) || b.slug.toLowerCase().includes(term));
    }, [
        blocks,
        search
    ]);
    const sections = React.useMemo(()=>groupBlocks(filtered), [
        filtered
    ]);
    const handlePick = (slug)=>{
        onSelect(slug);
        onOpenChange(false);
    };
    return /*#__PURE__*/ _jsx(Sheet, {
        open: open,
        onOpenChange: onOpenChange,
        children: /*#__PURE__*/ _jsxs(SheetContent, {
            className: "flex w-full flex-col gap-0 p-0 sm:max-w-md",
            children: [
                /*#__PURE__*/ _jsx(SheetHeader, {
                    className: "border-b",
                    children: /*#__PURE__*/ _jsx(SheetTitle, {
                        children: t('shadcnAdmin:addBlock')
                    })
                }),
                /*#__PURE__*/ _jsx("div", {
                    className: "border-b p-4",
                    children: /*#__PURE__*/ _jsx(Input, {
                        placeholder: t('shadcnAdmin:searchPlaceholder'),
                        value: search,
                        onChange: (e)=>setSearch(e.target.value),
                        autoFocus: true
                    })
                }),
                /*#__PURE__*/ _jsx("div", {
                    className: "flex-1 overflow-y-auto p-4",
                    children: filtered.length === 0 ? /*#__PURE__*/ _jsx("p", {
                        className: "py-6 text-center text-sm text-muted-foreground",
                        children: t('general:noResultsFound')
                    }) : /*#__PURE__*/ _jsx("div", {
                        className: "flex flex-col gap-4",
                        children: sections.map((section)=>/*#__PURE__*/ _jsxs("div", {
                                children: [
                                    section.heading ? /*#__PURE__*/ _jsx("p", {
                                        className: "mb-2 text-xs font-medium uppercase text-muted-foreground",
                                        children: section.heading
                                    }) : null,
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "grid grid-cols-2 gap-3 sm:grid-cols-3",
                                        children: section.blocks.map((block)=>/*#__PURE__*/ _jsxs("button", {
                                                type: "button",
                                                onClick: ()=>handlePick(block.slug),
                                                className: cn('group flex flex-col overflow-hidden rounded-md border bg-card text-left transition-colors', 'hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'),
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        className: "aspect-[3/2] overflow-hidden bg-muted",
                                                        children: block.thumbnail ? // eslint-disable-next-line @next/next/no-img-element
                                                        /*#__PURE__*/ _jsx("img", {
                                                            src: block.thumbnail.url,
                                                            alt: block.thumbnail.alt ?? blockLabelOf(block),
                                                            className: "size-full object-cover"
                                                        }) : /*#__PURE__*/ _jsx("div", {
                                                            className: "flex size-full items-center justify-center",
                                                            children: /*#__PURE__*/ _jsx(BlocksIcon, {
                                                                className: "size-6 text-muted-foreground"
                                                            })
                                                        })
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        className: "p-2",
                                                        children: /*#__PURE__*/ _jsx("p", {
                                                            className: "truncate text-xs font-medium",
                                                            children: blockLabelOf(block)
                                                        })
                                                    })
                                                ]
                                            }, block.slug))
                                    })
                                ]
                            }, section.heading ?? '__ungrouped'))
                    })
                })
            ]
        })
    });
}

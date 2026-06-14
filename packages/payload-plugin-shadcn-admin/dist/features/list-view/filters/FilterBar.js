'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Top-level filter chip bar. Reads filter state from useFilterUrlState,
   keeps a write-behind copy via usePreferencesSync, and renders the chips
   plus a trailing "+ Add filter" pill. Renders nothing chrome when the
   state is empty other than the pill itself. */ import * as React from 'react';
import { useFilterUrlState } from './useFilterUrlState.js';
import { usePreferencesSync } from '../prefs/usePreferencesSync.js';
import { AddFilterMenu } from './AddFilterMenu.js';
import { FilterChip } from './FilterChip.js';
import { OrGroupWrapper } from './OrGroupWrapper.js';
import { PresetsMenu } from './PresetsMenu.js';
const SYNTHETIC_FIELDS = [
    {
        type: 'text',
        name: 'id',
        label: 'ID'
    },
    {
        type: 'date',
        name: 'createdAt',
        label: 'Created'
    },
    {
        type: 'date',
        name: 'updatedAt',
        label: 'Updated'
    }
];
export function FilterBar({ collection, useAsTitleBySlug }) {
    const { state, addChip, updateChip, removeChip, moveChip, toggleOrJoin, replaceState, interactedRef } = useFilterUrlState();
    // Track which chip should open its editor on next mount as a (field|operator)
    // key — survives the pending → URL promotion (chip ID changes on promotion
    // but field+operator stay the same).
    const [autoOpenKey, setAutoOpenKey] = React.useState(null);
    // Clear autoOpenKey once a URL chip with that key exists — it has already
    // mounted with defaultOpen=true and now owns its popover state.
    React.useEffect(()=>{
        if (autoOpenKey === null) return;
        const hasUrlChip = state.nodes.some((node)=>{
            if (node.kind === 'chip') {
                return `${node.chip.field}|${node.chip.operator}` === autoOpenKey && node.chip.id.startsWith('c-');
            }
            return node.group.chips.some((c)=>`${c.field}|${c.operator}` === autoOpenKey && c.id.startsWith('c-'));
        });
        if (hasUrlChip) setAutoOpenKey(null);
    }, [
        state,
        autoOpenKey
    ]);
    usePreferencesSync({
        collectionSlug: collection.slug,
        state,
        onHydrate: replaceState,
        interactedRef
    });
    // Build the list of fields available to the picker: collection's own
    // fields + synthetic id/createdAt/updatedAt. De-duplicate by name.
    const allFields = React.useMemo(()=>{
        const seen = new Set();
        const out = [];
        for (const f of collection.fields){
            if (!f.name || seen.has(f.name)) continue;
            seen.add(f.name);
            out.push(f);
        }
        for (const f of SYNTHETIC_FIELDS){
            if (f.name && !seen.has(f.name)) {
                seen.add(f.name);
                out.push(f);
            }
        }
        return out;
    }, [
        collection.fields
    ]);
    const handleAdd = (chip)=>{
        addChip(chip);
        setAutoOpenKey(`${chip.field}|${chip.operator}`);
    };
    const renderChip = (chipData, options)=>/*#__PURE__*/ _jsx(FilterChip, {
            chip: chipData,
            fields: allFields,
            useAsTitleBySlug: useAsTitleBySlug,
            isInOrGroup: options.isInOrGroup,
            isFirstNode: options.isFirstNode,
            canMoveLeft: options.canMoveLeft,
            canMoveRight: options.canMoveRight,
            defaultOpen: autoOpenKey !== null && `${chipData.field}|${chipData.operator}` === autoOpenKey,
            onChange: (patch)=>{
                // If the user changed field/operator while editing, the chip's React
                // key changes too (anticipated id depends on field+op). Update
                // autoOpenKey to the new (field|op) so the remounted chip opens its
                // popover immediately.
                const nextField = patch.field ?? chipData.field;
                const nextOperator = patch.operator ?? chipData.operator;
                if (patch.field !== undefined && patch.field !== chipData.field || patch.operator !== undefined && patch.operator !== chipData.operator) {
                    setAutoOpenKey(`${nextField}|${nextOperator}`);
                }
                updateChip(chipData.id, patch);
            },
            onRemove: ()=>removeChip(chipData.id),
            onMove: (d)=>moveChip(chipData.id, d),
            onToggleOrJoin: ()=>toggleOrJoin(chipData.id)
        }, chipData.id);
    const lastIndex = state.nodes.length - 1;
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-wrap items-center gap-1.5",
        children: [
            state.nodes.map((node, i)=>{
                if (node.kind === 'chip') {
                    const sep = i > 0 ? /*#__PURE__*/ _jsx("span", {
                        className: "text-[10px] uppercase tracking-wide text-muted-foreground",
                        children: "and"
                    }, `sep-${i}`) : null;
                    return /*#__PURE__*/ _jsxs(React.Fragment, {
                        children: [
                            sep,
                            renderChip(node.chip, {
                                isInOrGroup: false,
                                isFirstNode: i === 0,
                                canMoveLeft: i > 0,
                                canMoveRight: i < lastIndex
                            })
                        ]
                    }, node.chip.id);
                }
                const sep = i > 0 ? /*#__PURE__*/ _jsx("span", {
                    className: "text-[10px] uppercase tracking-wide text-muted-foreground",
                    children: "and"
                }, `sep-${i}`) : null;
                return /*#__PURE__*/ _jsxs(React.Fragment, {
                    children: [
                        sep,
                        /*#__PURE__*/ _jsx(OrGroupWrapper, {
                            children: node.group.chips.map((c, j)=>renderChip(c, {
                                    isInOrGroup: true,
                                    isFirstNode: i === 0 && j === 0,
                                    canMoveLeft: false,
                                    canMoveRight: false
                                }))
                        })
                    ]
                }, node.group.id);
            }),
            state.nodes.length > 0 && /*#__PURE__*/ _jsx("span", {
                "aria-hidden": true,
                className: "mx-1 h-5 w-px bg-border"
            }),
            /*#__PURE__*/ _jsx(AddFilterMenu, {
                fields: allFields,
                onAdd: handleAdd
            }),
            /*#__PURE__*/ _jsx(PresetsMenu, {
                collectionSlug: collection.slug
            })
        ]
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Shared collapse-state utilities for ArrayInput and BlocksInput.
   Keeps both inputs DRY — they import the hook, controls component, and
   preview helper from here rather than duplicating the logic. */ import * as React from 'react';
import { ChevronsDownUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
/**
 * Tracks collapsed/expanded state per stable row id.
 *
 * - All ids present on first render start **collapsed** (true).
 * - Ids not in the map default to **expanded** (false) — newly-added rows that
 *   haven't been explicitly registered yet are treated as open.
 * - Call `markExpanded(id)` right after creating a new row so "Collapse all"
 *   can later reach it.
 * - `collapseAll`/`expandAll` operate on the live set of ids in the map.
 */ export function useRowCollapse(rowIds) {
    // Capture the initial ids so the lazy initializer is truly lazy (only runs
    // on mount, not on re-renders).
    const initialRef = React.useRef(rowIds);
    const [map, setMap] = React.useState(()=>{
        const m = {};
        for (const id of initialRef.current)m[id] = true;
        return m;
    });
    const isCollapsed = React.useCallback((id)=>map[id] ?? false, [
        map
    ]);
    const toggle = React.useCallback((id)=>setMap((prev)=>({
                ...prev,
                [id]: !(prev[id] ?? false)
            })), []);
    const collapseAll = React.useCallback(()=>setMap((prev)=>{
            const next = {};
            for (const id of Object.keys(prev))next[id] = true;
            return next;
        }), []);
    const expandAll = React.useCallback(()=>setMap((prev)=>{
            const next = {};
            for (const id of Object.keys(prev))next[id] = false;
            return next;
        }), []);
    const markExpanded = React.useCallback((id)=>setMap((prev)=>({
                ...prev,
                [id]: false
            })), []);
    return {
        isCollapsed,
        toggle,
        collapseAll,
        expandAll,
        markExpanded
    };
}
// ── Collapse-all / Expand-all controls ──────────────────────────────────────
export function RowCollapseControls({ onCollapseAll, onExpandAll }) {
    const { t } = useTranslation();
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-1 self-start",
        children: [
            /*#__PURE__*/ _jsxs(Button, {
                type: "button",
                variant: "ghost",
                size: "sm",
                onClick: onCollapseAll,
                className: "h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground",
                children: [
                    /*#__PURE__*/ _jsx(ChevronsDownUpIcon, {
                        className: "size-3.5"
                    }),
                    t('shadcnAdmin:collapseAll')
                ]
            }),
            /*#__PURE__*/ _jsxs(Button, {
                type: "button",
                variant: "ghost",
                size: "sm",
                onClick: onExpandAll,
                className: "h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground",
                children: [
                    /*#__PURE__*/ _jsx(ChevronsUpDownIcon, {
                        className: "size-3.5"
                    }),
                    t('shadcnAdmin:expandAll')
                ]
            })
        ]
    });
}
// ── Row preview derivation ───────────────────────────────────────────────────
const TEXT_LIKE = new Set([
    'text',
    'textarea',
    'email'
]);
/**
 * Returns a short preview string for a collapsed row — the value of the first
 * text/textarea/email subfield that has a non-empty value. Handles both plain
 * strings and locale-keyed objects `{ de: '…', en: '…' }` (picks the first
 * non-empty locale value). Returns `undefined` if no preview can be derived.
 */ export function deriveRowPreview(subfields, row) {
    for (const sub of subfields){
        if (!sub.name || !TEXT_LIKE.has(sub.type)) continue;
        const raw = row[sub.name];
        if (!raw) continue;
        if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (trimmed) return trimmed;
        } else if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
            // locale-keyed leaf: { de: '…', en: '…' }
            for (const v of Object.values(raw)){
                if (typeof v === 'string') {
                    const trimmed = v.trim();
                    if (trimmed) return trimmed;
                }
            }
        }
    }
    return undefined;
}

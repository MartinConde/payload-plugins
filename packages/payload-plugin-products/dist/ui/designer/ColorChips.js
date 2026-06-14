'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Chip strip below ViewTabs. One chip per color in `data.colors` (top-level
   relationship). Clicking a chip switches the active color — purely local
   state, no form writes. The active chip carries a lock icon that toggles
   `views.${i}.colorMockups.${j}.placementLocked`.

   The "+ Add color" button opens a small popover containing the shared
   RelationshipPicker against `color-swatches`. When the user picks an
   existing swatch we append its id to `data.colors` AND run the same
   reconcile-pure helper the server-side hook uses so the new chip is
   clickable IMMEDIATELY (the new `colorMockups[]` row exists in form state
   before the next save). To CREATE a new swatch the admin uses the General
   tab's `colors` relationship field — flagged as a rough edge for Phase 4. */ import * as React from 'react';
import { LockIcon, PlusIcon, UnlockIcon } from 'lucide-react';
import { useDocFormFieldValue, useDocFormSetValue } from 'payload-plugin-shadcn-ui';
// RelationshipPicker still lives in the admin plugin (it reads bridge-internal
// doc-identity / locale to exclude self-references).
import { RelationshipPicker } from 'payload-plugin-shadcn-admin/client';
import { useConfig, useTranslation } from '@payloadcms/ui';
import { reconcileColorMockupsPure } from '../printArea.js';
import { InlineCreateColor } from './InlineCreateColor.js';
const refToId = (raw)=>{
    if (raw == null) return null;
    if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
    if (typeof raw === 'object') {
        const id = raw.id;
        return id == null ? null : String(id);
    }
    return null;
};
export function ColorChips({ activeColor, onActiveColor, viewIndex, colorSwatchesSlug, disabled }) {
    const { t } = useTranslation();
    const tr = (k)=>t(k);
    const { config } = useConfig();
    const apiBase = React.useMemo(()=>{
        const server = config?.serverURL || '';
        const api = config?.routes?.api || '/api';
        return `${server}${api}`;
    }, [
        config
    ]);
    const setValueAtPath = useDocFormSetValue();
    const colorsRaw = useDocFormFieldValue('colors');
    const viewsRaw = useDocFormFieldValue('views');
    const lockedRaw = useDocFormFieldValue(`views.${viewIndex}.colorMockups.${activeColor}.placementLocked`);
    const colorIds = React.useMemo(()=>{
        if (!Array.isArray(colorsRaw)) return [];
        return colorsRaw.map(refToId).filter((id)=>id !== null);
    }, [
        colorsRaw
    ]);
    // Clamp activeColor when the colors list shrinks/reorders — mirrors
    // ViewTabs:53-56's pattern.
    React.useEffect(()=>{
        if (colorIds.length === 0) return;
        if (activeColor >= colorIds.length) {
            onActiveColor(Math.max(0, colorIds.length - 1));
        }
    }, [
        colorIds.length,
        activeColor,
        onActiveColor
    ]);
    // Batch-fetch color-swatch docs. Single request keyed by sorted ids so we
    // don't refetch on every click; depth=0 keeps the response small.
    const idsKey = colorIds.slice().sort().join(',');
    const [docsById, setDocsById] = React.useState(new Map());
    React.useEffect(()=>{
        if (colorIds.length === 0) {
            setDocsById(new Map());
            return;
        }
        let cancelled = false;
        const params = new URLSearchParams();
        colorIds.forEach((id)=>params.append('where[id][in][]', id));
        params.set('depth', '1');
        params.set('limit', String(colorIds.length));
        void (async ()=>{
            try {
                const res = await fetch(`${apiBase}/${colorSwatchesSlug}?${params.toString()}`, {
                    credentials: 'include'
                });
                if (!res.ok || cancelled) return;
                const json = await res.json();
                const map = new Map();
                for (const doc of json.docs ?? []){
                    map.set(String(doc.id), doc);
                }
                if (!cancelled) setDocsById(map);
            } catch  {
            // Soft fail — chips fall back to id-only labels.
            }
        })();
        return ()=>{
            cancelled = true;
        };
    }, [
        idsKey,
        apiBase,
        colorSwatchesSlug,
        colorIds
    ]);
    const handleAddExisting = React.useCallback((next)=>{
        if (!next) return;
        const incoming = Array.isArray(next) ? next : [
            next
        ];
        const merged = Array.from(new Set([
            ...colorIds,
            ...incoming.map(String)
        ]));
        if (merged.length === colorIds.length) return; // nothing new
        setValueAtPath('colors', merged);
        // Mirror the server-side reconcile client-side so the new chip is
        // immediately clickable and the canvas can bind to the new row before
        // save. Idempotent: existing rows are preserved by color id.
        const views = Array.isArray(viewsRaw) ? viewsRaw : [];
        if (views.length > 0) {
            const nextViews = reconcileColorMockupsPure(merged, views);
            setValueAtPath('views', nextViews);
        }
        onActiveColor(merged.length - 1);
    }, [
        colorIds,
        setValueAtPath,
        viewsRaw,
        onActiveColor
    ]);
    // Lock semantics:
    //  - Lock ON: the broadcast already keeps unlocked rows in sync with the
    //    current shared placement, so this row already mirrors it — flipping the
    //    flag snapshots that state implicitly. No placement write needed.
    //  - Lock OFF: ask whether to (a) overwrite this row with the shared
    //    placement, or (b) keep this row's geometry and broadcast TO it from now
    //    on. Choice is captured via window.confirm() — shadcn-admin doesn't
    //    re-export a Dialog primitive yet (flagged as Phase 5 polish in the
    //    plan). "OK" → use shared (recommended default); "Cancel" → keep current.
    const toggleLock = React.useCallback(()=>{
        const path = `views.${viewIndex}.colorMockups.${activeColor}.placementLocked`;
        if (!lockedRaw) {
            // turning ON — just flip
            setValueAtPath(path, true);
            return;
        }
        // turning OFF — ask
        const choice = (()=>{
            if (typeof window === 'undefined') return true;
            return window.confirm(tr('pluginProducts:unlockDialogDescription') + '\n\n' + tr('pluginProducts:unlockChooseUseShared') + ' → OK' + '\n' + tr('pluginProducts:unlockChooseKeepCurrent') + ' → Cancel');
        })();
        if (choice) {
            // Use the shared placement: copy from the first unlocked sibling (skip
            // self), or fall back to row 0 if all locked.
            const views = Array.isArray(viewsRaw) ? viewsRaw : [];
            const rows = Array.isArray(views[viewIndex]?.colorMockups) ? views[viewIndex].colorMockups : [];
            let source = [];
            for(let j = 0; j < rows.length; j++){
                if (j === activeColor) continue;
                if (!rows[j]?.placementLocked) {
                    source = Array.isArray(rows[j]?.printAreaPlacement) ? rows[j].printAreaPlacement : [];
                    break;
                }
            }
            if (source.length === 0 && rows[0]) {
                source = Array.isArray(rows[0].printAreaPlacement) ? rows[0].printAreaPlacement : [];
            }
            setValueAtPath(`views.${viewIndex}.colorMockups.${activeColor}.printAreaPlacement`, source);
        }
        setValueAtPath(path, false);
    }, [
        setValueAtPath,
        viewIndex,
        activeColor,
        lockedRaw,
        viewsRaw,
        tr
    ]);
    // Empty state handled by parent (NoColorsEmptyState); the chip strip still
    // renders the "+ Add color" affordance.
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-wrap items-center gap-1.5 py-1",
        children: [
            colorIds.map((id, j)=>{
                const doc = docsById.get(id);
                const hex = typeof doc?.hex === 'string' ? doc.hex : '#cccccc';
                const name = typeof doc?.name === 'string' ? doc.name : id;
                const swatchUrl = doc?.swatch && typeof doc.swatch === 'object' ? doc.swatch.url : undefined;
                const isActive = j === activeColor;
                // Chip is `<span role="button">` not `<button>` so the nested lock
                // toggle (which IS a real <button>) doesn't violate the
                // "<button> can't descend <button>" HTML rule (hydration warning).
                return /*#__PURE__*/ _jsxs("span", {
                    role: "button",
                    tabIndex: disabled ? -1 : 0,
                    "aria-pressed": isActive,
                    "aria-disabled": disabled || undefined,
                    onClick: ()=>{
                        if (disabled) return;
                        onActiveColor(j);
                    },
                    onKeyDown: (e)=>{
                        if (disabled) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onActiveColor(j);
                        }
                    },
                    className: 'group flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-xs transition outline-none focus-visible:ring-1 focus-visible:ring-ring ' + (disabled ? 'opacity-50 cursor-not-allowed ' : 'cursor-pointer ') + (isActive ? 'border-foreground/40 bg-background ring-1 ring-foreground/40' : 'border-transparent bg-muted/40 hover:border-foreground/20'),
                    title: name,
                    children: [
                        /*#__PURE__*/ _jsx("span", {
                            className: "inline-block size-5 rounded-sm border border-border",
                            style: swatchUrl ? {
                                backgroundImage: `url(${swatchUrl})`,
                                backgroundSize: 'cover'
                            } : {
                                backgroundColor: hex
                            },
                            "aria-hidden": true
                        }),
                        /*#__PURE__*/ _jsx("span", {
                            className: "max-w-24 truncate",
                            children: name
                        }),
                        isActive && !disabled ? /*#__PURE__*/ _jsx("button", {
                            type: "button",
                            onClick: (e)=>{
                                e.stopPropagation();
                                toggleLock();
                            },
                            className: "rounded p-0.5 text-muted-foreground hover:text-foreground",
                            title: lockedRaw ? tr('pluginProducts:unlockTooltip') : tr('pluginProducts:lockTooltip'),
                            "aria-label": lockedRaw ? tr('pluginProducts:unlockPlacement') : tr('pluginProducts:lockPlacement'),
                            children: lockedRaw ? /*#__PURE__*/ _jsx(LockIcon, {
                                className: "size-3.5"
                            }) : /*#__PURE__*/ _jsx(UnlockIcon, {
                                className: "size-3.5"
                            })
                        }) : null
                    ]
                }, id);
            }),
            !disabled ? // RelationshipPicker is itself popover-based, so don't wrap it in
            // another popover (focus capture / outside-click handlers collide).
            // Render the picker trigger inline; its own popover handles the
            // search dropdown. The picker is in multi=false mode and stays at
            // `value={null}` because we use it as a one-shot ADD action: every
            // selection is treated as a new id to merge into `colors`.
            // Phase 4 adds InlineCreateColor alongside for a one-click "+ create"
            // flow that doesn't require leaving the Designer tab.
            /*#__PURE__*/ _jsxs("span", {
                className: "inline-flex flex-wrap items-center gap-1",
                children: [
                    /*#__PURE__*/ _jsx(PlusIcon, {
                        className: "size-4 text-muted-foreground",
                        "aria-hidden": true
                    }),
                    /*#__PURE__*/ _jsxs("span", {
                        className: "text-xs text-muted-foreground",
                        children: [
                            tr('pluginProducts:addColor'),
                            ":"
                        ]
                    }),
                    /*#__PURE__*/ _jsx(RelationshipPicker, {
                        relatedSlug: colorSwatchesSlug,
                        useAsTitle: "name",
                        multi: false,
                        value: null,
                        onChange: handleAddExisting
                    }),
                    /*#__PURE__*/ _jsx(InlineCreateColor, {
                        colorSwatchesSlug: colorSwatchesSlug,
                        onCreated: (id)=>handleAddExisting(id)
                    })
                ]
            }) : null
        ]
    });
}

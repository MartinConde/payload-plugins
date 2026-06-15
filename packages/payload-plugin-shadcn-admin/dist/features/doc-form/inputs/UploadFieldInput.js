'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Field-level type:'upload' input.

   Non-polymorphic (`relationTo: 'media'`) — the value is a doc ID (single)
   or a list of doc IDs (`hasMany`) referencing the target upload collection,
   identical wire shape to a relationship field. Just with thumbnail polish
   and an "Upload new" affordance that drives Payload's BulkUpload drawer.

   Polymorphic (`relationTo: ['media', 'media-alt', ...]`, v3.6) — the value
   is a `{ relationTo, value }` envelope (`hasMany: false`) or an array of
   envelopes (`hasMany: true`), matching how Payload stores polymorphic
   relationships. A `Select` above the picker switches the active slug;
   switching clears the inner picker's selection without dropping previously-
   picked entries (in `hasMany` mode they remain in the chip list). The
   "Upload new" drawer creates into whichever slug is currently active. */ import * as React from 'react';
import { UploadIcon, XIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Badge } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { MediaPickerDialog } from '../upload/MediaPickerDialog.js';
import { UploadNewDialog } from '../upload/UploadNewDialog.js';
const normalizeNonPoly = (value, hasMany)=>{
    if (value === null || value === undefined) return hasMany ? [] : null;
    if (Array.isArray(value)) {
        return value.map((v)=>typeof v === 'object' && v && 'id' in v ? String(v.id) : String(v)).filter(Boolean);
    }
    if (typeof value === 'object' && 'id' in value) {
        return String(value.id);
    }
    return String(value);
};
const normalizePoly = (value)=>{
    if (value === null || value === undefined) return [];
    const arr = Array.isArray(value) ? value : [
        value
    ];
    const out = [];
    for (const item of arr){
        if (item && typeof item === 'object') {
            const entry = item;
            if ((typeof entry.value === 'string' || typeof entry.value === 'number') && typeof entry.relationTo === 'string') {
                out.push({
                    value: String(entry.value),
                    relationTo: entry.relationTo
                });
            } else if ((typeof entry.id === 'string' || typeof entry.id === 'number') && typeof entry.relationTo === 'string') {
                // Some populated Payload reads include the full doc with relationTo.
                out.push({
                    value: String(entry.id),
                    relationTo: entry.relationTo
                });
            }
        }
    }
    return out;
};
const collectIds = (v)=>{
    if (v === null) return [];
    if (Array.isArray(v)) return v;
    return [
        v
    ];
};
export function UploadFieldInput({ relationTo, hasMany = false, useAsTitleBySlug, uploadCollectionsBySlug = {}, value, onChange, disabled, invalid }) {
    const { t } = useTranslation();
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const isPoly = Array.isArray(relationTo);
    const polySlugs = isPoly ? relationTo : [];
    // Initial entries from value. For poly mode this is a list of envelopes;
    // for non-poly mode we recover entries by zipping ids with the single
    // relationTo.
    const polyEntries = React.useMemo(()=>isPoly ? normalizePoly(value) : [], [
        isPoly,
        value
    ]);
    const nonPolyNormalized = React.useMemo(()=>isPoly ? null : normalizeNonPoly(value, Boolean(hasMany)), [
        isPoly,
        value,
        hasMany
    ]);
    const [activeSlug, setActiveSlug] = React.useState(isPoly ? polyEntries[0]?.relationTo ?? polySlugs[0] ?? '' : relationTo);
    // Keep activeSlug in sync if the field's relationTo list itself changes
    // (rare — only on schema reload), or if the first picked entry's slug
    // changes outside our control.
    React.useEffect(()=>{
        if (!isPoly) {
            setActiveSlug(relationTo);
            return;
        }
        if (activeSlug && polySlugs.includes(activeSlug)) return;
        setActiveSlug(polyEntries[0]?.relationTo ?? polySlugs[0] ?? '');
    // intentionally narrow deps: do not refire on activeSlug itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isPoly,
        polySlugs.join(','),
        polyEntries.length
    ]);
    // Ids to fetch thumbnails for. In poly mode, group by slug so we fetch
    // each slug separately (the picker is keyed off a single slug at a time).
    const allEntries = isPoly ? polyEntries : collectIds(nonPolyNormalized).map((id)=>({
            value: id,
            relationTo: relationTo
        }));
    const useAsTitle = useAsTitleBySlug[activeSlug];
    // Fetch thumbnails for selected docs. In poly mode we group by slug and
    // fire one fetch per slug.
    const [loaded, setLoaded] = React.useState(new Map());
    const idsKey = allEntries.map((e)=>`${e.relationTo}:${e.value}`).join(',');
    React.useEffect(()=>{
        let cancelled = false;
        const bySlug = new Map();
        for (const e of allEntries){
            const k = `${e.relationTo}:${e.value}`;
            if (loaded.has(k)) continue;
            const list = bySlug.get(e.relationTo) ?? [];
            list.push(e.value);
            bySlug.set(e.relationTo, list);
        }
        if (bySlug.size === 0) return;
        void (async ()=>{
            const fetchPromises = [];
            for (const [slug, ids] of bySlug.entries()){
                const params = new URLSearchParams();
                params.set('limit', String(ids.length));
                // depth=0 — we just need url/thumbnailURL/filename/mimeType, which
                // are always part of the upload collection's serialized doc.
                params.set('depth', '0');
                for (const id of ids)params.append('where[id][in][]', id);
                const p = fetch(`/api/${slug}?${params.toString()}`, {
                    credentials: 'include'
                }).then(async (res)=>{
                    if (!res.ok) return null;
                    const data = await res.json();
                    return {
                        slug,
                        docs: data.docs ?? []
                    };
                }).catch(()=>null);
                fetchPromises.push(p);
            }
            const results = await Promise.all(fetchPromises);
            if (cancelled) return;
            setLoaded((prev)=>{
                const next = new Map(prev);
                for (const result of results){
                    if (!result) continue;
                    for (const d of result.docs){
                        const id = String(d.id);
                        next.set(`${result.slug}:${id}`, {
                            id,
                            url: typeof d.url === 'string' ? d.url : null,
                            thumbnailURL: typeof d.thumbnailURL === 'string' ? d.thumbnailURL : null,
                            filename: typeof d.filename === 'string' ? d.filename : null,
                            mimeType: typeof d.mimeType === 'string' ? d.mimeType : null
                        });
                    }
                }
                return next;
            });
        })();
        return ()=>{
            cancelled = true;
        };
    // loaded is intentionally NOT in deps — we read it for "missing" but
    // only want to trigger when the ID list itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        idsKey
    ]);
    // Value surfaced to MediaPickerDialog for the active-slug picker.
    // Non-poly hasMany: pass the full selection array so the dialog can
    //   pre-mark already-selected tiles (single mode: pass one id or null).
    // Poly: single → active-slug entry's id or null; hasMany → null (add-only).
    const mediaPickerValue = (()=>{
        if (isPoly) {
            if (hasMany) return null;
            const first = polyEntries[0];
            return first && first.relationTo === activeSlug ? first.value : null;
        }
        if (hasMany) return collectIds(nonPolyNormalized);
        return collectIds(nonPolyNormalized)[0] ?? null;
    })();
    const handlePick = (picked)=>{
        if (isPoly) {
            const pickedId = Array.isArray(picked) ? picked[0] : picked;
            if (!pickedId || !activeSlug) return;
            const entry = {
                value: String(pickedId),
                relationTo: activeSlug
            };
            if (!hasMany) {
                onChange(entry);
                return;
            }
            const exists = polyEntries.some((e)=>e.relationTo === entry.relationTo && e.value === entry.value);
            if (exists) return;
            onChange([
                ...polyEntries,
                entry
            ]);
            return;
        }
        // Non-poly: identical to the prior behavior.
        if (!hasMany) {
            onChange(picked === null ? null : Array.isArray(picked) ? picked[0] : picked);
            return;
        }
        if (picked === null) {
            onChange([]);
            return;
        }
        onChange(Array.isArray(picked) ? picked : [
            picked
        ]);
    };
    const removeEntry = (target)=>{
        if (isPoly) {
            if (!hasMany) {
                onChange(null);
                return;
            }
            onChange(polyEntries.filter((e)=>!(e.relationTo === target.relationTo && e.value === target.value)));
            return;
        }
        if (!hasMany) {
            onChange(null);
            return;
        }
        const ids = collectIds(nonPolyNormalized).filter((x)=>x !== target.value);
        onChange(ids);
    };
    // Newly-created docs come back from UploadNewDialog as `{ id, slug }[]`.
    // Merge them into the field value with the same poly / hasMany rules the
    // native bulk drawer's onSuccess used.
    const handleUploadSuccess = React.useCallback((created)=>{
        const newIds = created.map((c)=>String(c.id));
        if (newIds.length === 0) return;
        if (isPoly) {
            const newEntries = created.map((c)=>({
                    value: String(c.id),
                    relationTo: c.slug
                }));
            if (!hasMany) {
                onChange(newEntries[0] ?? null);
                return;
            }
            const dedup = new Map();
            for (const e of polyEntries)dedup.set(`${e.relationTo}:${e.value}`, e);
            for (const e of newEntries)dedup.set(`${e.relationTo}:${e.value}`, e);
            onChange(Array.from(dedup.values()));
            return;
        }
        const currentIds = collectIds(nonPolyNormalized);
        if (hasMany) {
            const merged = Array.from(new Set([
                ...currentIds,
                ...newIds
            ]));
            onChange(merged);
        } else {
            onChange(newIds[0]);
        }
    }, [
        hasMany,
        isPoly,
        polyEntries,
        nonPolyNormalized,
        onChange
    ]);
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-2",
        children: [
            allEntries.length > 0 ? /*#__PURE__*/ _jsx("div", {
                className: "flex flex-wrap gap-2",
                children: allEntries.map((entry)=>{
                    const key = `${entry.relationTo}:${entry.value}`;
                    const doc = loaded.get(key);
                    const src = doc?.thumbnailURL ?? doc?.url ?? null;
                    const isImg = doc?.mimeType?.startsWith('image/');
                    return /*#__PURE__*/ _jsxs("div", {
                        className: cn('group relative flex items-center gap-2 rounded-md border bg-card p-2', invalid && 'border-destructive'),
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                className: "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border bg-background",
                                children: isImg && src ? // eslint-disable-next-line @next/next/no-img-element
                                /*#__PURE__*/ _jsx("img", {
                                    src: src,
                                    alt: doc?.filename ?? '',
                                    className: "size-full object-contain"
                                }) : /*#__PURE__*/ _jsx(UploadIcon, {
                                    className: "size-5 text-muted-foreground"
                                })
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "min-w-0 max-w-[12rem]",
                                children: [
                                    isPoly ? /*#__PURE__*/ _jsx(Badge, {
                                        variant: "secondary",
                                        className: "mb-0.5 text-[10px] uppercase tracking-wide opacity-80",
                                        children: entry.relationTo
                                    }) : null,
                                    /*#__PURE__*/ _jsx("p", {
                                        className: "truncate text-xs font-medium",
                                        children: doc?.filename ?? entry.value
                                    }),
                                    /*#__PURE__*/ _jsx("p", {
                                        className: "truncate text-[10px] text-muted-foreground",
                                        children: doc?.mimeType ?? entry.value
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsx("button", {
                                type: "button",
                                className: "rounded-sm p-1 text-muted-foreground hover:text-foreground",
                                onClick: ()=>removeEntry(entry),
                                disabled: disabled,
                                "aria-label": "Remove",
                                children: /*#__PURE__*/ _jsx(XIcon, {
                                    className: "size-3.5"
                                })
                            })
                        ]
                    }, key);
                })
            }) : null,
            /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                    isPoly ? /*#__PURE__*/ _jsxs(Select, {
                        value: activeSlug,
                        onValueChange: (next)=>setActiveSlug(next),
                        disabled: disabled || polySlugs.length === 0,
                        children: [
                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                className: "w-40",
                                "aria-label": "Collection",
                                children: /*#__PURE__*/ _jsx(SelectValue, {
                                    placeholder: "Collection…"
                                })
                            }),
                            /*#__PURE__*/ _jsx(SelectContent, {
                                children: polySlugs.map((s)=>/*#__PURE__*/ _jsx(SelectItem, {
                                        value: s,
                                        children: s
                                    }, s))
                            })
                        ]
                    }) : null,
                    /*#__PURE__*/ _jsx("div", {
                        className: "flex-none",
                        children: activeSlug ? /*#__PURE__*/ _jsx(MediaPickerDialog, {
                            relatedSlug: activeSlug,
                            useAsTitle: useAsTitle,
                            multi: !isPoly && Boolean(hasMany),
                            value: mediaPickerValue,
                            onChange: (next)=>handlePick(next),
                            disabled: disabled
                        }) : null
                    }),
                    /*#__PURE__*/ _jsxs(Button, {
                        type: "button",
                        size: "sm",
                        variant: "outline",
                        disabled: disabled || !activeSlug,
                        onClick: ()=>setDialogOpen(true),
                        children: [
                            /*#__PURE__*/ _jsx(UploadIcon, {
                                className: "size-3.5"
                            }),
                            /*#__PURE__*/ _jsx("span", {
                                className: "ml-1",
                                children: t('shadcnAdmin:uploadNew')
                            })
                        ]
                    })
                ]
            }),
            activeSlug ? /*#__PURE__*/ _jsx(UploadNewDialog, {
                open: dialogOpen,
                onOpenChange: setDialogOpen,
                collectionSlug: activeSlug,
                uploadCollectionsBySlug: uploadCollectionsBySlug,
                useAsTitleBySlug: useAsTitleBySlug,
                maxFiles: hasMany ? 0 : 1,
                onSuccess: handleUploadSuccess
            }) : null
        ]
    });
}

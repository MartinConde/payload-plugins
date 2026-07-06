'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* The bulk-edit sheet's review step: a diff list of picked-field → new-value,
   resolving relationship/upload ids to their `useAsTitle` for readability.
   Split out of BulkEditSheet.tsx, which owns the picked-field state and value
   shim this renders. */ import * as React from 'react';
import { useTranslation } from '../../../internal/payloadAdapterUI.js';
import { getByPath, isObject } from '../../doc-form/fieldTree/sharedHelpers.js';
export const formatDiffValue = (value)=>{
    if (value === null) return '∅ (null)';
    if (value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        return `${value.length} item${value.length === 1 ? '' : 's'}`;
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};
export function ReviewList({ pickedPaths, leafByPath, projected, count, useAsTitleBySlug }) {
    const { t } = useTranslation();
    if (pickedPaths.length === 0) {
        return /*#__PURE__*/ _jsx("p", {
            className: "text-sm text-muted-foreground",
            children: t('shadcnAdmin:noChangesToApply')
        });
    }
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-3",
        children: [
            /*#__PURE__*/ _jsx("p", {
                className: "text-sm text-muted-foreground",
                children: t('shadcnAdmin:changesApplyIntro', {
                    count
                })
            }),
            /*#__PURE__*/ _jsx("dl", {
                className: "flex flex-col gap-2 rounded-md border bg-muted/30 p-3",
                children: pickedPaths.map((path)=>{
                    const leaf = leafByPath.get(path);
                    return /*#__PURE__*/ _jsxs("div", {
                        className: "flex flex-col gap-0.5 text-sm sm:flex-row sm:items-start sm:gap-3",
                        children: [
                            /*#__PURE__*/ _jsx("dt", {
                                className: "font-medium text-foreground sm:w-40 sm:shrink-0",
                                children: leaf?.label ?? path
                            }),
                            /*#__PURE__*/ _jsx("dd", {
                                className: "break-words text-muted-foreground",
                                children: /*#__PURE__*/ _jsx(ReviewValue, {
                                    field: leaf?.field,
                                    value: getByPath(projected, path),
                                    useAsTitleBySlug: useAsTitleBySlug
                                })
                            })
                        ]
                    }, path);
                })
            })
        ]
    });
}
/* Normalize a relationship/upload value into a flat list of {slug, id}, across
   single / hasMany / polymorphic-envelope shapes. */ const toRefEntries = (value, relationTo)=>{
    const single = (v)=>{
        if (v === null || v === undefined) return null;
        if (isObject(v) && 'value' in v && typeof v.relationTo === 'string') {
            const id = v.value;
            if (typeof id === 'string' || typeof id === 'number') return {
                slug: v.relationTo,
                id
            };
            return null;
        }
        if (typeof v === 'string' || typeof v === 'number') {
            const slug = Array.isArray(relationTo) ? relationTo[0] : relationTo;
            return slug ? {
                slug,
                id: v
            } : null;
        }
        return null;
    };
    const arr = Array.isArray(value) ? value : [
        value
    ];
    return arr.map(single).filter((e)=>e !== null);
};
/* Review-step value renderer. Relationship/upload fields resolve their ids to
   the related doc's `useAsTitle` (falling back to the id); other types use
   formatDiffValue. */ function ReviewValue({ field, value, useAsTitleBySlug }) {
    const isRef = field?.type === 'relationship' || field?.type === 'upload';
    const entries = React.useMemo(()=>isRef ? toRefEntries(value, field?.relationTo) : [], [
        isRef,
        value,
        field?.relationTo
    ]);
    const [titles, setTitles] = React.useState({});
    const key = entries.map((e)=>`${e.slug}:${e.id}`).join(',');
    React.useEffect(()=>{
        if (entries.length === 0) return;
        let cancelled = false;
        const bySlug = new Map();
        for (const e of entries){
            const list = bySlug.get(e.slug) ?? [];
            list.push(e.id);
            bySlug.set(e.slug, list);
        }
        void (async ()=>{
            const next = {};
            await Promise.all(Array.from(bySlug.entries()).map(async ([slug, ids])=>{
                const useAsTitle = useAsTitleBySlug[slug];
                const params = new URLSearchParams();
                params.set('depth', '0');
                params.set('limit', String(ids.length));
                ids.forEach((id)=>params.append('where[id][in][]', String(id)));
                try {
                    const res = await fetch(`/api/${slug}?${params.toString()}`, {
                        credentials: 'include'
                    });
                    if (!res.ok) return;
                    const body = await res.json();
                    for (const d of body.docs ?? []){
                        const t = useAsTitle ? d[useAsTitle] : undefined;
                        next[`${slug}:${String(d.id)}`] = typeof t === 'string' && t.length > 0 ? t : String(d.id);
                    }
                } catch  {
                // leave unresolved → falls back to id
                }
            }));
            if (!cancelled) setTitles(next);
        })();
        return ()=>{
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        key
    ]);
    if (!isRef) return /*#__PURE__*/ _jsx(_Fragment, {
        children: formatDiffValue(value)
    });
    if (entries.length === 0) return /*#__PURE__*/ _jsx(_Fragment, {
        children: formatDiffValue(value)
    });
    return /*#__PURE__*/ _jsx(_Fragment, {
        children: entries.map((e)=>titles[`${e.slug}:${e.id}`] ?? String(e.id)).join(', ')
    });
}

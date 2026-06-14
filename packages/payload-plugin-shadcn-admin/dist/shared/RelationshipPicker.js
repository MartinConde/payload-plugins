'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Async autocomplete picker for relationship filter values. Queries
   /api/{relatedSlug}?where[{useAsTitle}][like]=... to find matching docs and
   returns one (single) or many (multi) doc IDs upstream. Falls back to a
   plain ID text input when the related collection has no useAsTitle. */ import * as React from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { useTranslation } from '../internal/payloadAdapter.js';
import { Badge } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { useActiveLocale, useDocIdentity, cn } from 'payload-plugin-shadcn-ui';
const titleOf = (doc, useAsTitle)=>{
    const v = doc[useAsTitle];
    if (typeof v === 'string' && v.length > 0) return v;
    if (typeof v === 'number') return String(v);
    return String(doc.id);
};
export function RelationshipPicker({ relatedSlug, useAsTitle, multi, value, onChange, excludeDescendantsPath }) {
    if (!useAsTitle) {
        return /*#__PURE__*/ _jsx(PlainIdInput, {
            multi: multi,
            value: value,
            onChange: onChange
        });
    }
    return /*#__PURE__*/ _jsx(AsyncRelationshipPicker, {
        relatedSlug: relatedSlug,
        useAsTitle: useAsTitle,
        multi: multi,
        value: value,
        onChange: onChange,
        excludeDescendantsPath: excludeDescendantsPath
    });
}
function AsyncRelationshipPicker({ relatedSlug, useAsTitle, multi, value, onChange, excludeDescendantsPath }) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [results, setResults] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [titleCache, setTitleCache] = React.useState({});
    // v3.8 — resolve titles in the doc form's active locale (null in contexts
    // without a LocaleProvider, e.g. list-view filters → no locale param, which
    // matches Payload's default-locale behaviour). The cache is keyed by locale
    // so switching locales doesn't surface a stale title for a selected id.
    const activeLocale = useActiveLocale();
    const cacheKey = React.useCallback((id)=>`${activeLocale ?? ''}:${id}`, [
        activeLocale
    ]);
    // Exclude the document being edited from its own self-referential pickers
    // (e.g. a page can't be its own parent). Only applies when the relationship
    // targets the same collection as the current doc; `null` elsewhere.
    const { collectionSlug, documentId } = useDocIdentity();
    const excludeSelfId = documentId != null && collectionSlug === relatedSlug ? String(documentId) : null;
    const selectedIds = React.useMemo(()=>{
        if (value === null || value === undefined) return [];
        if (Array.isArray(value)) return value.map(String);
        return [
            String(value)
        ];
    }, [
        value
    ]);
    // Look up titles for currently-selected IDs that we don't have cached
    React.useEffect(()=>{
        const missing = selectedIds.filter((id)=>!(cacheKey(id) in titleCache));
        if (missing.length === 0) return;
        let cancelled = false;
        void (async ()=>{
            const params = new URLSearchParams();
            missing.forEach((id)=>params.append('where[id][in][]', id));
            params.set('depth', '0');
            params.set('limit', String(missing.length));
            // Resolve titles for drafts too, so an unpublished selected doc shows its
            // title instead of falling back to the id.
            params.set('draft', 'true');
            if (activeLocale) params.set('locale', activeLocale);
            try {
                const res = await fetch(`/api/${relatedSlug}?${params.toString()}`, {
                    credentials: 'include'
                });
                if (!res.ok || cancelled) return;
                const body = await res.json();
                const next = {};
                for (const doc of body.docs ?? []){
                    next[cacheKey(String(doc.id))] = titleOf(doc, useAsTitle);
                }
                if (Object.keys(next).length > 0 && !cancelled) {
                    setTitleCache((prev)=>({
                            ...prev,
                            ...next
                        }));
                }
            } catch  {
            // Ignore; chip will fall back to showing the ID
            }
        })();
        return ()=>{
            cancelled = true;
        };
    }, [
        selectedIds,
        titleCache,
        relatedSlug,
        useAsTitle,
        activeLocale,
        cacheKey
    ]);
    // Async search
    React.useEffect(()=>{
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        const t = setTimeout(async ()=>{
            try {
                const params = new URLSearchParams();
                if (search.trim().length > 0) {
                    params.set(`where[${useAsTitle}][like]`, search.trim());
                }
                params.set('limit', '10');
                params.set('depth', '0');
                // Include drafts so unpublished docs are pickable and show their title.
                params.set('draft', 'true');
                if (activeLocale) params.set('locale', activeLocale);
                // Never offer the current doc as a match for its own self-referential
                // relationship (e.g. a page as its own parent), nor its descendants
                // (prevents parent cycles).
                if (excludeSelfId) {
                    params.set('where[id][not_equals]', excludeSelfId);
                    if (excludeDescendantsPath) {
                        params.append(`where[${excludeDescendantsPath}][not_in][]`, excludeSelfId);
                    }
                }
                const res = await fetch(`/api/${relatedSlug}?${params.toString()}`, {
                    credentials: 'include'
                });
                if (!res.ok || cancelled) return;
                const body = await res.json();
                const next = (body.docs ?? []).map((d)=>({
                        id: d.id,
                        title: titleOf(d, useAsTitle)
                    }));
                if (!cancelled) {
                    setResults(next);
                    setTitleCache((prev)=>{
                        const merged = {
                            ...prev
                        };
                        for (const r of next)merged[cacheKey(String(r.id))] = r.title;
                        return merged;
                    });
                }
            } catch  {
                if (!cancelled) setResults([]);
            } finally{
                if (!cancelled) setLoading(false);
            }
        }, 200);
        return ()=>{
            cancelled = true;
            clearTimeout(t);
        };
    }, [
        open,
        search,
        relatedSlug,
        useAsTitle,
        activeLocale,
        cacheKey,
        excludeSelfId,
        excludeDescendantsPath
    ]);
    const selectedTitles = selectedIds.map((id)=>titleCache[cacheKey(id)] ?? id);
    const handleSelect = (id)=>{
        if (!multi) {
            onChange(id);
            setOpen(false);
            return;
        }
        const next = selectedIds.includes(id) ? selectedIds.filter((x)=>x !== id) : [
            ...selectedIds,
            id
        ];
        onChange(next);
    };
    const removeOne = (id)=>{
        if (!multi) {
            onChange(null);
            return;
        }
        onChange(selectedIds.filter((x)=>x !== id));
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-2",
        children: [
            selectedIds.length > 0 && /*#__PURE__*/ _jsx("div", {
                className: "flex flex-wrap gap-1",
                children: selectedIds.map((id, i)=>/*#__PURE__*/ _jsxs(Badge, {
                        variant: "secondary",
                        className: "gap-1 pr-1",
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                className: "max-w-[12rem] truncate",
                                children: selectedTitles[i]
                            }),
                            /*#__PURE__*/ _jsx("button", {
                                type: "button",
                                onClick: ()=>removeOne(id),
                                className: "hover:bg-muted-foreground/20 rounded-sm",
                                "aria-label": t('general:remove'),
                                children: /*#__PURE__*/ _jsx(XIcon, {
                                    className: "size-3"
                                })
                            })
                        ]
                    }, id))
            }),
            /*#__PURE__*/ _jsxs(Popover, {
                open: open,
                onOpenChange: setOpen,
                children: [
                    /*#__PURE__*/ _jsx(PopoverTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsx(Button, {
                            type: "button",
                            variant: "outline",
                            size: "sm",
                            className: "justify-start",
                            children: selectedIds.length === 0 ? `${t('general:select')}…` : multi ? `${t('shadcnAdmin:addMore')}…` : t('shadcnAdmin:pickerChange')
                        })
                    }),
                    /*#__PURE__*/ _jsx(PopoverContent, {
                        className: "w-72 p-0",
                        align: "start",
                        children: /*#__PURE__*/ _jsxs(Command, {
                            shouldFilter: false,
                            children: [
                                /*#__PURE__*/ _jsx(CommandInput, {
                                    placeholder: t('shadcnAdmin:searchPlaceholder'),
                                    value: search,
                                    onValueChange: setSearch
                                }),
                                /*#__PURE__*/ _jsxs(CommandList, {
                                    children: [
                                        !loading && results.length === 0 && /*#__PURE__*/ _jsx(CommandEmpty, {
                                            children: t('general:noResultsFound')
                                        }),
                                        /*#__PURE__*/ _jsx(CommandGroup, {
                                            children: results.map((r)=>{
                                                const id = String(r.id);
                                                const isSelected = selectedIds.includes(id);
                                                return /*#__PURE__*/ _jsxs(CommandItem, {
                                                    value: id,
                                                    onSelect: ()=>handleSelect(id),
                                                    children: [
                                                        /*#__PURE__*/ _jsx("span", {
                                                            className: "flex-1 truncate",
                                                            children: r.title
                                                        }),
                                                        /*#__PURE__*/ _jsx(CheckIcon, {
                                                            className: cn('size-4', isSelected ? 'opacity-100' : 'opacity-0')
                                                        })
                                                    ]
                                                }, id);
                                            })
                                        })
                                    ]
                                })
                            ]
                        })
                    })
                ]
            })
        ]
    });
}
function PlainIdInput({ multi, value, onChange }) {
    if (!multi) {
        return /*#__PURE__*/ _jsx(Input, {
            placeholder: "Document ID",
            value: typeof value === 'string' ? value : '',
            onChange: (e)=>onChange(e.target.value || null),
            className: "h-8"
        });
    }
    const arr = Array.isArray(value) ? value : [];
    return /*#__PURE__*/ _jsx(Input, {
        placeholder: "Document IDs (comma-separated)",
        value: arr.join(','),
        onChange: (e)=>{
            const parts = e.target.value.split(',').map((s)=>s.trim()).filter(Boolean);
            onChange(parts);
        },
        className: "h-8"
    });
}

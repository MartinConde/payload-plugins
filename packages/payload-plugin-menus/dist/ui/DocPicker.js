'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Compact single-document picker. Unlike shadcn-admin's RelationshipPicker
   (which renders the selection as a chip ABOVE a "Change…" trigger), this shows
   the selected document's title INSIDE the combobox trigger — the modern
   select-style UX the menu editor wants. Client-only (lives behind the lazy
   MenuTreeEditor), so it freely uses shadcn primitives. Queries
   `/api/{slug}?where[{useAsTitle}][like]=…` exactly like RelationshipPicker. */ import * as React from 'react';
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import clsx from 'clsx';
import { Button, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
const titleOf = (doc, useAsTitle)=>{
    const v = doc[useAsTitle];
    if (typeof v === 'string' && v.length > 0) return v;
    if (typeof v === 'number') return String(v);
    return String(doc.id);
};
export function DocPicker({ relatedSlug, useAsTitle, value, onChange, activeLocale, disabled, placeholder = 'Select…', searchPlaceholder = 'Search…', emptyLabel = 'No results', clearLabel = 'Clear' }) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [results, setResults] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [titleCache, setTitleCache] = React.useState({});
    const cacheKey = React.useCallback((id)=>`${activeLocale ?? ''}:${id}`, [
        activeLocale
    ]);
    // Resolve the selected id's title (so the trigger can show it).
    React.useEffect(()=>{
        if (!value || !useAsTitle || cacheKey(value) in titleCache) return;
        let cancelled = false;
        void (async ()=>{
            try {
                const params = new URLSearchParams({
                    depth: '0',
                    draft: 'true'
                });
                if (activeLocale) params.set('locale', activeLocale);
                const res = await fetch(`/api/${relatedSlug}/${value}?${params.toString()}`, {
                    credentials: 'include'
                });
                if (!res.ok || cancelled) return;
                const doc = await res.json();
                if (!cancelled) {
                    setTitleCache((p)=>({
                            ...p,
                            [cacheKey(value)]: titleOf(doc, useAsTitle)
                        }));
                }
            } catch  {
            /* trigger falls back to the id */ }
        })();
        return ()=>{
            cancelled = true;
        };
    }, [
        value,
        useAsTitle,
        relatedSlug,
        activeLocale,
        cacheKey,
        titleCache
    ]);
    // Search while open.
    React.useEffect(()=>{
        if (!open || !useAsTitle) return;
        let cancelled = false;
        setLoading(true);
        const handle = setTimeout(async ()=>{
            try {
                const params = new URLSearchParams({
                    depth: '0',
                    draft: 'true',
                    limit: '10'
                });
                if (search.trim()) params.set(`where[${useAsTitle}][like]`, search.trim());
                if (activeLocale) params.set('locale', activeLocale);
                const res = await fetch(`/api/${relatedSlug}?${params.toString()}`, {
                    credentials: 'include'
                });
                if (!res.ok || cancelled) return;
                const body = await res.json();
                const next = (body.docs ?? []).map((d)=>({
                        id: String(d.id),
                        title: titleOf(d, useAsTitle)
                    }));
                if (!cancelled) {
                    setResults(next);
                    setTitleCache((p)=>{
                        const merged = {
                            ...p
                        };
                        for (const r of next)merged[cacheKey(r.id)] = r.title;
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
            clearTimeout(handle);
        };
    }, [
        open,
        search,
        relatedSlug,
        useAsTitle,
        activeLocale,
        cacheKey
    ]);
    const selectedTitle = value ? titleCache[cacheKey(value)] ?? value : '';
    // No useAsTitle on the related collection → plain id input fallback.
    if (!useAsTitle) {
        return /*#__PURE__*/ _jsx("input", {
            value: value ?? '',
            disabled: disabled,
            placeholder: "Document ID",
            onChange: (e)=>onChange(e.target.value || null),
            className: "h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        });
    }
    return /*#__PURE__*/ _jsxs(Popover, {
        open: open,
        onOpenChange: setOpen,
        children: [
            /*#__PURE__*/ _jsx(PopoverTrigger, {
                asChild: true,
                children: /*#__PURE__*/ _jsxs(Button, {
                    type: "button",
                    variant: "outline",
                    disabled: disabled,
                    className: "h-8 w-full justify-between border-input px-3 font-normal",
                    children: [
                        /*#__PURE__*/ _jsx("span", {
                            className: clsx('truncate', !selectedTitle && 'text-muted-foreground'),
                            children: selectedTitle || placeholder
                        }),
                        /*#__PURE__*/ _jsx(ChevronsUpDownIcon, {
                            className: "size-4 shrink-0 opacity-50"
                        })
                    ]
                })
            }),
            /*#__PURE__*/ _jsx(PopoverContent, {
                className: "w-[--radix-popover-trigger-width] min-w-64 p-0",
                align: "start",
                children: /*#__PURE__*/ _jsxs(Command, {
                    shouldFilter: false,
                    children: [
                        /*#__PURE__*/ _jsx(CommandInput, {
                            placeholder: searchPlaceholder,
                            value: search,
                            onValueChange: setSearch
                        }),
                        /*#__PURE__*/ _jsxs(CommandList, {
                            children: [
                                !loading && results.length === 0 ? /*#__PURE__*/ _jsx(CommandEmpty, {
                                    children: emptyLabel
                                }) : null,
                                value ? /*#__PURE__*/ _jsx(CommandGroup, {
                                    children: /*#__PURE__*/ _jsxs(CommandItem, {
                                        value: "__clear__",
                                        onSelect: ()=>{
                                            onChange(null);
                                            setOpen(false);
                                        },
                                        className: "text-muted-foreground",
                                        children: [
                                            /*#__PURE__*/ _jsx(XIcon, {
                                                className: "size-4"
                                            }),
                                            clearLabel
                                        ]
                                    })
                                }) : null,
                                /*#__PURE__*/ _jsx(CommandGroup, {
                                    children: results.map((r)=>/*#__PURE__*/ _jsxs(CommandItem, {
                                            value: r.id,
                                            onSelect: ()=>{
                                                onChange(r.id);
                                                setOpen(false);
                                            },
                                            children: [
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "flex-1 truncate",
                                                    children: r.title
                                                }),
                                                /*#__PURE__*/ _jsx(CheckIcon, {
                                                    className: clsx('size-4', value === r.id ? 'opacity-100' : 'opacity-0')
                                                })
                                            ]
                                        }, r.id))
                                })
                            ]
                        })
                    ]
                })
            })
        ]
    });
}

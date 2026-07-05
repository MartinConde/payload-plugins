'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* v3.22 — "Group by" picker. URL-param state (`?listGroupBy=<field>`,
   `-field` for descending group order); selecting a field reloads the list
   grouped, "None" clears it.

   The param is deliberately NOT `?groupBy=` — see the comment in
   AutoCollectionListView.tsx where it's parsed: that name is reserved by
   Payload core's own list-view route for a native, sticky (non-clearable)
   preference, and reusing it means "None" never durably sticks.

   The active grouping comes from the `current` PROP, set by the RSC from the
   server-parsed `listGroupBy` — NOT from `useSearchParams()`. Inside Payload's
   admin shell that hook lags a navigation by a tick, and because the flat and
   grouped views render *different* GroupByMenu instances, a freshly-mounted
   menu would read the stale value and show the wrong label until a second
   click. The server already knows the truth (it picked the flat vs grouped
   branch), so we trust the prop. Navigation still reads the live
   `window.location.search`. */ import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapterUI.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from 'payload-plugin-shadcn-ui';
export function GroupByMenu({ fields, current }) {
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    if (fields.length === 0) return null;
    const currentField = fields.find((f)=>f.name === current);
    const apply = (value)=>{
        // Live query string (the address bar updates with the push; only Next's
        // `useSearchParams()` hook lags, so we avoid it entirely here).
        const search = typeof window !== 'undefined' ? window.location.search : '';
        const next = new URLSearchParams(search);
        // `set('listGroupBy', '')` rather than `delete` — Payload's own
        // ListQueryProvider (@payloadcms/ui) still wraps this custom list view and
        // its sanitizeQuery only treats an empty-string value as "clear this key";
        // omitting the key outright lets its stale client-side copy of the old
        // value silently resurrect on the next render (see GroupedListToolbar.tsx
        // for the fuller writeup — same mechanism, there for `search`).
        next.set('listGroupBy', value ?? '');
        next.delete('page'); // reset pagination when grouping changes
        const qs = next.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
    };
    return /*#__PURE__*/ _jsxs(DropdownMenu, {
        children: [
            /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                asChild: true,
                children: /*#__PURE__*/ _jsxs(Button, {
                    variant: "outline",
                    size: "sm",
                    children: [
                        /*#__PURE__*/ _jsx(Layers, {
                            className: "mr-2 h-4 w-4"
                        }),
                        currentField ? t('shadcnAdmin:groupedBy', {
                            label: currentField.label
                        }) : t('shadcnAdmin:groupBy')
                    ]
                })
            }),
            /*#__PURE__*/ _jsxs(DropdownMenuContent, {
                align: "end",
                children: [
                    /*#__PURE__*/ _jsx(DropdownMenuLabel, {
                        children: t('shadcnAdmin:groupBy')
                    }),
                    /*#__PURE__*/ _jsx(DropdownMenuItem, {
                        onSelect: ()=>apply(null),
                        disabled: !current,
                        children: t('shadcnAdmin:groupingNone')
                    }),
                    /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                    fields.map((f)=>/*#__PURE__*/ _jsx(DropdownMenuItem, {
                            onSelect: ()=>apply(f.name),
                            disabled: f.name === current,
                            children: f.label
                        }, f.name))
                ]
            })
        ]
    });
}

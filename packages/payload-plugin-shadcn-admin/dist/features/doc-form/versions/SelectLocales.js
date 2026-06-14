'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Locale-pill toggles for the version diff view. Mirrors Payload's
   SelectLocales: each enabled locale shows its diff column; toggling writes the
   active set to `?localeCodes=` (JSON array) and the RSC re-expands localized
   leaves accordingly. Only rendered when localization is configured. v3.9. */ import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
export function SelectLocales({ locales, selected }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedSet = new Set(selected);
    const toggle = (code)=>{
        const next = new Set(selectedSet);
        if (next.has(code)) {
            // Keep at least one locale selected.
            if (next.size > 1) next.delete(code);
        } else {
            next.add(code);
        }
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        const codes = locales.map((l)=>l.code).filter((c)=>next.has(c));
        // When everything is selected, drop the param (the default is "all").
        if (codes.length === locales.length) params.delete('localeCodes');
        else params.set('localeCodes', JSON.stringify(codes));
        router.push(`?${params.toString()}`);
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-2",
        children: [
            /*#__PURE__*/ _jsx("span", {
                className: "text-sm text-muted-foreground",
                children: "Locales"
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "flex flex-wrap gap-1.5",
                children: locales.map((loc)=>{
                    const active = selectedSet.has(loc.code);
                    return /*#__PURE__*/ _jsx("button", {
                        type: "button",
                        onClick: ()=>toggle(loc.code),
                        children: /*#__PURE__*/ _jsx(Badge, {
                            variant: "outline",
                            className: cn('cursor-pointer font-medium uppercase tracking-wider', active ? 'bg-foreground/10 text-foreground' : 'opacity-50'),
                            title: loc.label,
                            children: loc.code
                        })
                    }, loc.code);
                })
            })
        ]
    });
}

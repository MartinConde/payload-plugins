'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Launch card for the SEO setup wizard, mounted on the `seo-settings` global
   via shadcn-admin's group-level `.input` override (same mechanism as
   SeoGroupInput). Because it's a DIRECT component reference in the global
   config, its import graph is loaded by the Payload CLI in plain Node — so this
   file must stay Node-safe: NO value imports from
   `payload-plugin-shadcn-admin/client` (its barrel → @payloadcms/ui → CSS
   imports that crash Node). Types are `import type` (erased); the link is a
   plain anchor + lucide icon + theme-token classes. */ import * as React from 'react';
import { Wand2, ArrowRight } from 'lucide-react';
const tr = (t, key, fallback)=>{
    const tt = t;
    return tt ? tt(key) : fallback;
};
/** The override receives the full FieldInputProps; this presentational launcher
   only reads `t`. The hosting group carries no data (a single `ui` child), so
   there's nothing to render or write. */ export function SeoWizardLaunch({ t }) {
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex items-start gap-3",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        className: "flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
                        children: /*#__PURE__*/ _jsx(Wand2, {
                            className: "size-5"
                        })
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "space-y-0.5",
                        children: [
                            /*#__PURE__*/ _jsx("p", {
                                className: "text-sm font-medium text-foreground",
                                children: tr(t, 'pluginSeo:launchTitle', 'SEO setup wizard')
                            }),
                            /*#__PURE__*/ _jsx("p", {
                                className: "text-sm text-muted-foreground",
                                children: tr(t, 'pluginSeo:launchDesc', 'Walk through your site-wide SEO essentials step by step.')
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("a", {
                href: "/admin/seo-wizard",
                className: "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                children: [
                    tr(t, 'pluginSeo:launchCta', 'Open setup wizard'),
                    /*#__PURE__*/ _jsx(ArrowRight, {
                        className: "size-4"
                    })
                ]
            })
        ]
    });
}

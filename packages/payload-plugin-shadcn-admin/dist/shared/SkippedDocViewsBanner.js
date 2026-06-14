'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useAuth, useConfig } from '../internal/payloadAdapter.js';
import { Badge } from 'payload-plugin-shadcn-ui';
const STORAGE_KEY = 'shadcn-admin:skipped-doc-views-dismissed';
const PLUGIN_NAMESPACE = 'plugin-shadcn-admin';
const getSkipped = (configCustom)=>{
    if (!configCustom || typeof configCustom !== 'object') return [];
    const ns = configCustom[PLUGIN_NAMESPACE];
    if (!ns || typeof ns !== 'object') return [];
    const raw = ns.skippedDocViews;
    if (!Array.isArray(raw)) return [];
    return raw;
};
export function SkippedDocViewsBanner() {
    const auth = useAuth();
    const config = useConfig();
    const [dismissed, setDismissed] = React.useState(true) // hidden until mount checks storage
    ;
    const skipped = React.useMemo(()=>getSkipped(config?.config?.custom), [
        config
    ]);
    // Stable signature of the current skip set; session-dismissal is keyed on it
    // so a NEW skip (e.g. a freshly-added collection) re-shows the banner even
    // if a previous version was dismissed.
    const signature = React.useMemo(()=>skipped.map((s)=>`${s.kind}:${s.slug}:${s.types.join(',')}`).join('|'), [
        skipped
    ]);
    React.useEffect(()=>{
        if (!skipped.length) {
            setDismissed(true);
            return;
        }
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            setDismissed(stored === signature);
        } catch  {
            setDismissed(false);
        }
    }, [
        signature,
        skipped.length
    ]);
    const dismiss = React.useCallback(()=>{
        setDismissed(true);
        try {
            sessionStorage.setItem(STORAGE_KEY, signature);
        } catch  {
        /* sessionStorage unavailable; banner just hides for this render */ }
    }, [
        signature
    ]);
    if (dismissed) return null;
    if (!skipped.length) return null;
    // Admin-only — non-admin users see nothing.
    const user = auth?.user;
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isAdmin = roles.includes('admin');
    if (!isAdmin) return null;
    return /*#__PURE__*/ _jsx("div", {
        className: "twp",
        role: "status",
        style: {
            position: 'fixed',
            bottom: 12,
            right: 12,
            zIndex: 9999,
            maxWidth: 480
        },
        children: /*#__PURE__*/ _jsxs("div", {
            className: "bg-card border border-border rounded-md shadow-lg p-3 text-sm space-y-2",
            children: [
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex items-start justify-between gap-3",
                    children: [
                        /*#__PURE__*/ _jsxs("div", {
                            className: "font-medium",
                            children: [
                                "shadcn admin: ",
                                skipped.length,
                                " doc view",
                                skipped.length === 1 ? '' : 's',
                                " skipped"
                            ]
                        }),
                        /*#__PURE__*/ _jsx("button", {
                            type: "button",
                            onClick: dismiss,
                            className: "text-muted-foreground hover:text-foreground",
                            "aria-label": "Dismiss",
                            children: "✕"
                        })
                    ]
                }),
                /*#__PURE__*/ _jsxs("p", {
                    className: "text-muted-foreground text-xs",
                    children: [
                        "One or more ",
                        skipped.length === 1 ? 'entity has' : 'entities have',
                        " a required field outside the doc-form matrix; Payload's default edit view is used instead. Add a per-field",
                        ' ',
                        /*#__PURE__*/ _jsx("code", {
                            className: "text-foreground",
                            children: ".custom['plugin-shadcn-admin'].input"
                        }),
                        ' ',
                        "override to render those fields with shadcn."
                    ]
                }),
                /*#__PURE__*/ _jsx("div", {
                    className: "flex flex-wrap gap-1",
                    children: skipped.map((s)=>/*#__PURE__*/ _jsxs(Badge, {
                            variant: "outline",
                            children: [
                                s.kind,
                                "/",
                                s.slug,
                                ": ",
                                s.types.join(', ')
                            ]
                        }, `${s.kind}:${s.slug}`))
                })
            ]
        })
    });
}

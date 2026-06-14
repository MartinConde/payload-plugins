'use client';
import { jsx as _jsx } from "react/jsx-runtime";
/* Node-safe shell for the SEO-tab placeholder. Same lazy pattern as the
   other plugin ui-field shells — only `react` value-imported at module top so
   the Payload CLI's Node config load doesn't pull a CSS chain. */ import * as React from 'react';
const SeoPlaceholderInner = /*#__PURE__*/ React.lazy(()=>import('./SeoPlaceholderInner.js').then((m)=>({
            default: m.SeoPlaceholderInner
        })));
export function SeoPlaceholder() {
    return /*#__PURE__*/ _jsx(React.Suspense, {
        fallback: /*#__PURE__*/ _jsx("div", {
            className: "h-32 w-full animate-pulse rounded-lg border bg-muted/30",
            "aria-busy": "true"
        }),
        children: /*#__PURE__*/ _jsx(SeoPlaceholderInner, {})
    });
}

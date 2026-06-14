'use client';
import { jsx as _jsx } from "react/jsx-runtime";
/* Node-safe shell for the `designerCanvas` ui-field `.input` override. Mirrors
   `PrintAreaInput`: value-imports ONLY `react` so it can be referenced directly
   from the collection config (pulled into the Payload CLI's Node config load).
   The heavy canvas — which imports `fabric` (touches `window` at import time),
   `@payloadcms/ui`, and shadcn primitives — is reached exclusively via the
   lazy `import()` below, never evaluated during the Node load. */ import * as React from 'react';
const DesignerCanvas = /*#__PURE__*/ React.lazy(()=>import('./DesignerCanvas.js').then((m)=>({
            default: m.DesignerCanvas
        })));
export function DesignerField(props) {
    return /*#__PURE__*/ _jsx(React.Suspense, {
        fallback: /*#__PURE__*/ _jsx("div", {
            className: "h-96 w-full animate-pulse rounded-lg border bg-muted/30",
            "aria-busy": "true",
            "aria-label": "Loading product designer…"
        }),
        children: /*#__PURE__*/ _jsx(DesignerCanvas, {
            ...props
        })
    });
}

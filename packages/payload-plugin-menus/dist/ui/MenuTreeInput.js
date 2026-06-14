'use client';
import { jsx as _jsx } from "react/jsx-runtime";
/* The `.input` override mounted by shadcn-admin's FieldInput on the `menus`
   `tree` field. It is referenced as a DIRECT component reference in the
   collection config (`field.custom['plugin-shadcn-admin'].input`), so this
   module is pulled into the Payload server config graph and loaded by the
   Payload CLI in plain Node.

   THEREFORE this file must stay Node-safe: it value-imports ONLY `react` and
   uses `import type` for the prop contract. The heavy editor (shadcn primitives,
   dnd-kit, RelationshipPicker — all of which transitively pull @payloadcms/ui /
   CSS that crash Node) is loaded via `React.lazy(() => import(...))`. The
   dynamic `import()` is never evaluated during config load, so none of that
   reaches Node — only the browser, where this client component actually runs. */ import * as React from 'react';
const MenuTreeEditor = /*#__PURE__*/ React.lazy(()=>import('./MenuTreeEditor.js').then((m)=>({
            default: m.MenuTreeEditor
        })));
export function MenuTreeInput(props) {
    return /*#__PURE__*/ _jsx(React.Suspense, {
        fallback: /*#__PURE__*/ _jsx("div", {
            className: "h-40 w-full animate-pulse rounded-lg border bg-muted/30",
            "aria-busy": "true",
            "aria-label": "Loading menu editor…"
        }),
        children: /*#__PURE__*/ _jsx(MenuTreeEditor, {
            ...props
        })
    });
}

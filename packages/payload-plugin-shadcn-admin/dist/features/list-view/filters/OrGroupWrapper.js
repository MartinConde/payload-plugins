'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Visual wrapper for adjacent OR-joined chips. Renders a subtle tinted
   background with `or` separators between children. */ import * as React from 'react';
export function OrGroupWrapper({ children }) {
    return /*#__PURE__*/ _jsx("span", {
        className: "inline-flex items-center gap-1 rounded-md bg-muted/60 px-1 py-0.5",
        children: children.map((child, i)=>/*#__PURE__*/ _jsxs(React.Fragment, {
                children: [
                    i > 0 && /*#__PURE__*/ _jsx("span", {
                        className: "text-[10px] uppercase tracking-wide text-muted-foreground",
                        children: "or"
                    }),
                    child
                ]
            }, i))
    });
}

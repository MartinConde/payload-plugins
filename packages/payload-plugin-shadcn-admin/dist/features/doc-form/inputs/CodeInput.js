'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Code field input. Payload stores code as a plain string; admin.language
   controls editor highlighting in the stock admin but is informational only
   here (we render a monospace textarea — no syntax highlighting in v2). */ import * as React from 'react';
import { Textarea } from 'payload-plugin-shadcn-ui';
export function CodeInput({ id, value, language, onChange, required, invalid, disabled }) {
    const stringVal = typeof value === 'string' ? value : '';
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-1",
        children: [
            /*#__PURE__*/ _jsx(Textarea, {
                id: id,
                value: stringVal,
                onChange: (e)=>onChange(e.target.value),
                rows: 8,
                spellCheck: false,
                required: required,
                disabled: disabled,
                "aria-invalid": invalid ? true : undefined,
                className: "font-mono text-xs leading-relaxed aria-invalid:border-destructive aria-invalid:ring-destructive/40"
            }),
            language ? /*#__PURE__*/ _jsx("span", {
                className: "text-[10px] uppercase tracking-wide text-muted-foreground",
                children: language
            }) : null
        ]
    });
}

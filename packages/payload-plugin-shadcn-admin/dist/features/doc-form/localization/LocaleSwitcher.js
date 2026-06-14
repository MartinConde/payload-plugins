'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* v3.8 — locale switcher for the auto doc form.
   Renders a shadcn Select scoped to the configured locales. On change, the
   bridge swaps active-locale state and triggers a single getFormState
   rebuild for richText editors. No router push — unsaved edits in other
   locales remain in client state. */ import * as React from 'react';
import { GlobeIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
export function LocaleSwitcher({ locales, activeLocale, onChange, disabled }) {
    if (!locales || locales.length <= 1) return null;
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-1.5",
        children: [
            /*#__PURE__*/ _jsx(GlobeIcon, {
                className: "size-3.5 text-muted-foreground"
            }),
            /*#__PURE__*/ _jsxs(Select, {
                value: activeLocale,
                onValueChange: onChange,
                disabled: disabled,
                children: [
                    /*#__PURE__*/ _jsx(SelectTrigger, {
                        className: "h-8 w-32",
                        "data-testid": "locale-switcher",
                        children: /*#__PURE__*/ _jsx(SelectValue, {})
                    }),
                    /*#__PURE__*/ _jsx(SelectContent, {
                        children: locales.map((loc)=>/*#__PURE__*/ _jsx(SelectItem, {
                                value: loc.code,
                                children: loc.label
                            }, loc.code))
                    })
                ]
            })
        ]
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { PaletteIcon } from 'lucide-react';
import { Card, CardContent } from 'payload-plugin-shadcn-ui';
import { useTranslation } from '@payloadcms/ui';
/* Rendered in place of the canvas when the product has no colors yet.
   Points the admin at the General tab's `colors` relationship — that's
   where colors get created via Payload's allowCreate drawer, the chip
   strip's "+ Add color" only adds EXISTING swatches. */ export function NoColorsEmptyState() {
    const { t } = useTranslation();
    const tr = (k)=>t(k);
    return /*#__PURE__*/ _jsx(Card, {
        className: "border-dashed",
        children: /*#__PURE__*/ _jsxs(CardContent, {
            className: "flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground",
            children: [
                /*#__PURE__*/ _jsx(PaletteIcon, {
                    className: "size-6"
                }),
                /*#__PURE__*/ _jsx("p", {
                    className: "max-w-sm text-sm",
                    children: tr('pluginProducts:noColorsHint')
                })
            ]
        })
    });
}

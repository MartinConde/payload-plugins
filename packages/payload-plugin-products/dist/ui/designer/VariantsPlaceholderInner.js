'use client';
import { jsx as _jsx } from "react/jsx-runtime";
/* Browser-only inner of VariantsPlaceholder. Reached via React.lazy so its
   @payloadcms/ui / shadcn-admin value imports never hit the Payload CLI's
   Node config load. */ import * as React from 'react';
import { Card, CardContent } from 'payload-plugin-shadcn-ui';
import { useTranslation } from '@payloadcms/ui';
export function VariantsPlaceholderInner() {
    const { t } = useTranslation();
    const tr = (k)=>t(k);
    return /*#__PURE__*/ _jsx(Card, {
        className: "border-dashed",
        children: /*#__PURE__*/ _jsx(CardContent, {
            className: "py-8 text-center text-sm text-muted-foreground",
            children: tr('pluginProducts:variantsComingSoon')
        })
    });
}

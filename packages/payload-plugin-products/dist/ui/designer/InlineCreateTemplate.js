'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* "+ Create new template" affordance for the view-level print-area picker.
   Mirrors InlineCreateColor — opens a Payload DocumentDrawer against
   `print-templates`, and fires `onCreated(id)` once the new doc is saved. */ import * as React from 'react';
import { PlusIcon } from 'lucide-react';
import { useDocumentDrawer, useTranslation } from '@payloadcms/ui';
export function InlineCreateTemplate({ printTemplatesSlug, onCreated, disabled }) {
    const { t } = useTranslation();
    const tr = (k)=>t(k);
    const [Drawer, Toggler] = useDocumentDrawer({
        collectionSlug: printTemplatesSlug
    });
    return /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
            /*#__PURE__*/ _jsxs(Toggler, {
                disabled: disabled,
                className: "inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
                children: [
                    /*#__PURE__*/ _jsx(PlusIcon, {
                        className: "size-3.5",
                        "aria-hidden": true
                    }),
                    tr('pluginProducts:createNewTemplate')
                ]
            }),
            /*#__PURE__*/ _jsx(Drawer, {
                onSave: ({ doc, operation })=>{
                    if (operation !== 'create') return;
                    const id = doc?.id;
                    if (id != null) onCreated(String(id));
                }
            })
        ]
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* "+ Create new color" affordance for the chip strip. Thin wrapper around
   Payload's `useDocumentDrawer` against the `color-swatches` collection.

   The drawer's `onSave` fires `onCreated(id)` so the parent (ColorChips) can
   route the new id through its existing `handleAddExisting` path, which
   merges into `data.colors` and runs the client-side `reconcileColorMockupsPure`
   so the new chip is clickable IMMEDIATELY (no page refresh).

   Node-safe: this file is only ever imported from DesignerCanvas (lazy-loaded
   under DesignerField's Suspense boundary), so the top-level `@payloadcms/ui`
   import never reaches the Node config-load path. */ import * as React from 'react';
import { PlusIcon } from 'lucide-react';
import { useDocumentDrawer, useTranslation } from '@payloadcms/ui';
export function InlineCreateColor({ colorSwatchesSlug, onCreated, disabled }) {
    const { t } = useTranslation();
    const tr = (k)=>t(k);
    const [Drawer, Toggler] = useDocumentDrawer({
        collectionSlug: colorSwatchesSlug
    });
    return /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
            /*#__PURE__*/ _jsxs(Toggler, {
                disabled: disabled,
                className: "inline-flex items-center gap-1 rounded-md border border-dashed border-foreground/20 px-1.5 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                children: [
                    /*#__PURE__*/ _jsx(PlusIcon, {
                        className: "size-3.5",
                        "aria-hidden": true
                    }),
                    tr('pluginProducts:createNewColor')
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

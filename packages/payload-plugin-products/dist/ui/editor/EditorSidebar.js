'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Tabbed sidebar: Print Areas (default) | Image | Sync. */ import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'payload-plugin-shadcn-ui';
import { SyncActionsPanel } from '../designer/SyncActionsPanel.js';
import { useEditor } from './EditorContext.js';
import { ImageTab } from './tabs/ImageTab.js';
import { PrintAreasTab } from './tabs/PrintAreasTab.js';
export function EditorSidebar() {
    const { tr } = useEditor();
    return /*#__PURE__*/ _jsxs(Tabs, {
        defaultValue: "areas",
        className: "w-full",
        children: [
            /*#__PURE__*/ _jsxs(TabsList, {
                className: "grid w-full grid-cols-3",
                children: [
                    /*#__PURE__*/ _jsx(TabsTrigger, {
                        value: "areas",
                        children: tr('pluginProducts:printAreasTab')
                    }),
                    /*#__PURE__*/ _jsx(TabsTrigger, {
                        value: "image",
                        children: tr('pluginProducts:imageTab')
                    }),
                    /*#__PURE__*/ _jsx(TabsTrigger, {
                        value: "sync",
                        children: tr('pluginProducts:syncTab')
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(TabsContent, {
                value: "areas",
                children: /*#__PURE__*/ _jsx(PrintAreasTab, {})
            }),
            /*#__PURE__*/ _jsx(TabsContent, {
                value: "image",
                children: /*#__PURE__*/ _jsx(ImageTab, {})
            }),
            /*#__PURE__*/ _jsx(TabsContent, {
                value: "sync",
                children: /*#__PURE__*/ _jsx(SyncActionsPanel, {})
            })
        ]
    });
}

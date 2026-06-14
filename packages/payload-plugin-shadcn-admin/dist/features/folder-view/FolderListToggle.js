'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import Link from 'next/link';
import { LayoutList, FolderTree } from 'lucide-react';
import { useTranslation } from '../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
/* List ⇄ Folders toggle rendered in the auto list view's header. Flips a
   `?view=folders` query param that AutoCollectionListView branches on — it
   deliberately does NOT set Payload's `listViewType` preference, which would
   route `/collections/:slug` to Payload's hardcoded (non-overridable) folder
   view instead of ours. */ export function FolderListToggle({ basePath, mode }) {
    const { t } = useTranslation();
    return /*#__PURE__*/ _jsxs("div", {
        className: "inline-flex overflow-hidden rounded-md border",
        children: [
            /*#__PURE__*/ _jsx(Button, {
                asChild: true,
                size: "sm",
                variant: mode === 'list' ? 'secondary' : 'ghost',
                className: cn('rounded-none border-0'),
                children: /*#__PURE__*/ _jsxs(Link, {
                    href: basePath,
                    "aria-current": mode === 'list',
                    children: [
                        /*#__PURE__*/ _jsx(LayoutList, {
                            className: "mr-2 h-4 w-4"
                        }),
                        t('shadcnAdmin:listView')
                    ]
                })
            }),
            /*#__PURE__*/ _jsx(Button, {
                asChild: true,
                size: "sm",
                variant: mode === 'folders' ? 'secondary' : 'ghost',
                className: cn('rounded-none border-0'),
                children: /*#__PURE__*/ _jsxs(Link, {
                    href: `${basePath}?view=folders`,
                    "aria-current": mode === 'folders',
                    children: [
                        /*#__PURE__*/ _jsx(FolderTree, {
                            className: "mr-2 h-4 w-4"
                        }),
                        t('folder:folders')
                    ]
                })
            })
        ]
    });
}

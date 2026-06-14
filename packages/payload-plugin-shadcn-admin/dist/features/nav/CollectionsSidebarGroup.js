'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Database } from 'lucide-react';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from 'payload-plugin-shadcn-ui';
import { useActiveMatcher } from './useActiveMatcher.js';
export function CollectionsSidebarGroup({ collections, label = 'Collections', defaultIcon: DefaultIcon = Database }) {
    const isActive = useActiveMatcher();
    if (collections.length === 0) return null;
    return /*#__PURE__*/ _jsxs(SidebarGroup, {
        children: [
            label && /*#__PURE__*/ _jsx(SidebarGroupLabel, {
                children: label
            }),
            /*#__PURE__*/ _jsx(SidebarGroupContent, {
                children: /*#__PURE__*/ _jsx(SidebarMenu, {
                    children: collections.map((c)=>{
                        const Icon = c.icon ?? DefaultIcon;
                        const href = c.href ?? `/admin/collections/${c.slug}`;
                        return /*#__PURE__*/ _jsx(SidebarMenuItem, {
                            children: /*#__PURE__*/ _jsx(SidebarMenuButton, {
                                tooltip: c.label,
                                isActive: isActive(href),
                                asChild: true,
                                children: /*#__PURE__*/ _jsxs("a", {
                                    href: href,
                                    children: [
                                        /*#__PURE__*/ _jsx(Icon, {}),
                                        /*#__PURE__*/ _jsx("span", {
                                            children: c.label
                                        })
                                    ]
                                })
                            })
                        }, c.slug);
                    })
                })
            })
        ]
    });
}

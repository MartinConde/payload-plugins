'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import * as LucideIcons from 'lucide-react';
import { Box, ChevronRight } from 'lucide-react';
import { CollectionsSidebarGroup } from './CollectionsSidebarGroup.js';
import { NavUser } from './NavUser.js';
import { RebuildFrontendButton } from './RebuildFrontendButton.js';
import { ThemeSwitcher } from './ThemeSwitcher.js';
import { UiFlavorProvider } from './ThemeProvider.js';
import { useActiveMatcher } from './useActiveMatcher.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'payload-plugin-shadcn-ui';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarRail } from 'payload-plugin-shadcn-ui';
/* Resolves an IconRef to a renderable component. String → lucide lookup;
   component → returned as-is; missing/unknown → null. */ const resolveIcon = (ref)=>{
    if (!ref) return null;
    if (typeof ref === 'string') {
        const Icon = LucideIcons[ref];
        return Icon ?? null;
    }
    return ref;
};
const Icon = ({ icon, className })=>{
    const Resolved = resolveIcon(icon);
    return Resolved ? /*#__PURE__*/ _jsx(Resolved, {
        className: className
    }) : null;
};
const resolveHref = (item)=>{
    if (item.href) return item.href;
    if (item.collectionSlug) return `/admin/collections/${item.collectionSlug}`;
    if (item.globalSlug) return `/admin/globals/${item.globalSlug}`;
    return undefined;
};
const itemKey = (item, idx)=>item.href ?? item.collectionSlug ?? item.globalSlug ?? `${item.label}:${idx}`;
function RenderNavItem({ item }) {
    const href = resolveHref(item);
    const hasChildren = (item.items?.length ?? 0) > 0;
    const isActive = useActiveMatcher();
    if (hasChildren) {
        // Parent highlights when it (or any child) matches the current route.
        const parentActive = isActive(href) || item.items.some((sub)=>isActive(resolveHref(sub)));
        return /*#__PURE__*/ _jsx(Collapsible, {
            asChild: true,
            className: "group/collapsible",
            defaultOpen: parentActive,
            children: /*#__PURE__*/ _jsxs(SidebarMenuItem, {
                children: [
                    /*#__PURE__*/ _jsx(CollapsibleTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsxs(SidebarMenuButton, {
                            tooltip: item.label,
                            isActive: parentActive,
                            children: [
                                /*#__PURE__*/ _jsx(Icon, {
                                    icon: item.icon,
                                    className: "size-4"
                                }),
                                /*#__PURE__*/ _jsx("span", {
                                    children: item.label
                                }),
                                /*#__PURE__*/ _jsx(ChevronRight, {
                                    className: "ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90"
                                })
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsx(CollapsibleContent, {
                        children: /*#__PURE__*/ _jsx(SidebarMenuSub, {
                            children: item.items.map((sub, i)=>/*#__PURE__*/ _jsx(SidebarMenuSubItem, {
                                    children: /*#__PURE__*/ _jsx(SidebarMenuSubButton, {
                                        asChild: true,
                                        isActive: isActive(resolveHref(sub)),
                                        children: /*#__PURE__*/ _jsxs("a", {
                                            href: resolveHref(sub) ?? '#',
                                            children: [
                                                /*#__PURE__*/ _jsx(Icon, {
                                                    icon: sub.icon,
                                                    className: "size-4"
                                                }),
                                                /*#__PURE__*/ _jsx("span", {
                                                    children: sub.label
                                                })
                                            ]
                                        })
                                    })
                                }, itemKey(sub, i)))
                        })
                    })
                ]
            })
        });
    }
    // Leaf item — render as a link.
    return /*#__PURE__*/ _jsx(SidebarMenuItem, {
        children: /*#__PURE__*/ _jsx(SidebarMenuButton, {
            tooltip: item.label,
            isActive: isActive(href),
            asChild: true,
            children: /*#__PURE__*/ _jsxs("a", {
                href: href ?? '#',
                children: [
                    /*#__PURE__*/ _jsx(Icon, {
                        icon: item.icon,
                        className: "size-4"
                    }),
                    /*#__PURE__*/ _jsx("span", {
                        children: item.label
                    })
                ]
            })
        })
    });
}
export function DefaultAdminSidebar({ user, branding, groups, collections, children, rebuildFrontend, collapsible = 'icon', ...sidebarProps }) {
    const { name = 'CMS', subtitle = 'Payload admin', icon: brandIconRef, href = '/admin' } = branding ?? {};
    const BrandIcon = resolveIcon(brandIconRef) ?? Box;
    return /*#__PURE__*/ _jsx(UiFlavorProvider, {
        children: /*#__PURE__*/ _jsxs(Sidebar, {
            collapsible: collapsible,
            ...sidebarProps,
            children: [
                /*#__PURE__*/ _jsx(SidebarHeader, {
                    children: /*#__PURE__*/ _jsx(SidebarMenu, {
                        children: /*#__PURE__*/ _jsx(SidebarMenuItem, {
                            children: /*#__PURE__*/ _jsx(SidebarMenuButton, {
                                size: "lg",
                                asChild: true,
                                children: /*#__PURE__*/ _jsxs("a", {
                                    href: href,
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground",
                                            children: /*#__PURE__*/ _jsx(BrandIcon, {
                                                className: "size-4"
                                            })
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid flex-1 text-left text-sm leading-tight",
                                            children: [
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "truncate font-medium",
                                                    children: name
                                                }),
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "truncate text-xs text-muted-foreground",
                                                    children: subtitle
                                                })
                                            ]
                                        })
                                    ]
                                })
                            })
                        })
                    })
                }),
                /*#__PURE__*/ _jsxs(SidebarContent, {
                    children: [
                        groups && groups.length > 0 ? groups.map((group, gi)=>/*#__PURE__*/ _jsxs(SidebarGroup, {
                                children: [
                                    group.label ? /*#__PURE__*/ _jsx(SidebarGroupLabel, {
                                        children: group.label
                                    }) : null,
                                    /*#__PURE__*/ _jsx(SidebarMenu, {
                                        children: group.items.map((item, i)=>/*#__PURE__*/ _jsx(RenderNavItem, {
                                                item: item
                                            }, itemKey(item, i)))
                                    })
                                ]
                            }, group.label ?? `group:${gi}`)) : /*#__PURE__*/ _jsx(CollectionsSidebarGroup, {
                            collections: collections ?? []
                        }),
                        children
                    ]
                }),
                /*#__PURE__*/ _jsxs(SidebarFooter, {
                    children: [
                        rebuildFrontend ? /*#__PURE__*/ _jsx(RebuildFrontendButton, {
                            ...rebuildFrontend
                        }) : null,
                        /*#__PURE__*/ _jsx(NavUser, {
                            user: user,
                            extraItems: /*#__PURE__*/ _jsx(ThemeSwitcher, {})
                        })
                    ]
                }),
                /*#__PURE__*/ _jsx(SidebarRail, {})
            ]
        })
    });
}

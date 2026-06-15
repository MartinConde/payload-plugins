'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { ChevronsUpDown, LogOut, User } from 'lucide-react';
import { useTranslation } from '../../internal/payloadAdapter.js';
import { Avatar, AvatarFallback, AvatarImage } from 'payload-plugin-shadcn-ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from 'payload-plugin-shadcn-ui';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from 'payload-plugin-shadcn-ui';
function initials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
export function NavUser({ user, accountHref = '/admin/account', logoutHref = '/admin/logout', extraItems }) {
    const { isMobile } = useSidebar();
    const { t } = useTranslation();
    const fallback = initials(user.name || user.email || '?');
    return /*#__PURE__*/ _jsx(SidebarMenu, {
        children: /*#__PURE__*/ _jsx(SidebarMenuItem, {
            children: /*#__PURE__*/ _jsxs(DropdownMenu, {
                children: [
                    /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsxs(SidebarMenuButton, {
                            size: "lg",
                            className: "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                            children: [
                                /*#__PURE__*/ _jsxs(Avatar, {
                                    className: "h-8 w-8 rounded-lg",
                                    children: [
                                        user.avatar && /*#__PURE__*/ _jsx(AvatarImage, {
                                            src: user.avatar,
                                            alt: user.name
                                        }),
                                        /*#__PURE__*/ _jsx(AvatarFallback, {
                                            className: "rounded-lg",
                                            children: fallback
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "grid flex-1 text-left text-sm leading-tight",
                                    children: [
                                        /*#__PURE__*/ _jsx("span", {
                                            className: "truncate font-medium",
                                            children: user.name
                                        }),
                                        /*#__PURE__*/ _jsx("span", {
                                            className: "truncate text-xs",
                                            children: user.email
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsx(ChevronsUpDown, {
                                    className: "ml-auto size-4"
                                })
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsxs(DropdownMenuContent, {
                        className: "w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg",
                        side: isMobile ? 'bottom' : 'right',
                        align: "end",
                        sideOffset: 4,
                        children: [
                            /*#__PURE__*/ _jsx(DropdownMenuLabel, {
                                className: "p-0 font-normal",
                                children: /*#__PURE__*/ _jsxs("div", {
                                    className: "flex items-center gap-2 px-1 py-1.5 text-left text-sm",
                                    children: [
                                        /*#__PURE__*/ _jsxs(Avatar, {
                                            className: "h-8 w-8 rounded-lg",
                                            children: [
                                                user.avatar && /*#__PURE__*/ _jsx(AvatarImage, {
                                                    src: user.avatar,
                                                    alt: user.name
                                                }),
                                                /*#__PURE__*/ _jsx(AvatarFallback, {
                                                    className: "rounded-lg",
                                                    children: fallback
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid flex-1 text-left text-sm leading-tight",
                                            children: [
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "truncate font-medium",
                                                    children: user.name
                                                }),
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "truncate text-xs",
                                                    children: user.email
                                                })
                                            ]
                                        })
                                    ]
                                })
                            }),
                            accountHref && /*#__PURE__*/ _jsxs(_Fragment, {
                                children: [
                                    /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                                    /*#__PURE__*/ _jsx(DropdownMenuGroup, {
                                        children: /*#__PURE__*/ _jsx(DropdownMenuItem, {
                                            asChild: true,
                                            children: /*#__PURE__*/ _jsxs("a", {
                                                href: accountHref,
                                                children: [
                                                    /*#__PURE__*/ _jsx(User, {}),
                                                    t('authentication:account')
                                                ]
                                            })
                                        })
                                    })
                                ]
                            }),
                            extraItems && /*#__PURE__*/ _jsxs(_Fragment, {
                                children: [
                                    /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                                    /*#__PURE__*/ _jsx(DropdownMenuGroup, {
                                        children: extraItems
                                    })
                                ]
                            }),
                            logoutHref && /*#__PURE__*/ _jsxs(_Fragment, {
                                children: [
                                    /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                                    /*#__PURE__*/ _jsx(DropdownMenuItem, {
                                        asChild: true,
                                        children: /*#__PURE__*/ _jsxs("a", {
                                            href: logoutHref,
                                            children: [
                                                /*#__PURE__*/ _jsx(LogOut, {}),
                                                t('authentication:logOut')
                                            ]
                                        })
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        })
    });
}

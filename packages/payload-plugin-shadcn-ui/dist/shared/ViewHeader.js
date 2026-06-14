'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../ui/breadcrumb.js';
import { Separator } from '../ui/separator.js';
import { SidebarTrigger } from '../ui/sidebar.js';
export function ViewHeader({ breadcrumbs = [], actions }) {
    return /*#__PURE__*/ _jsxs("header", {
        className: "flex h-16 shrink-0 items-center gap-2 border-b px-4",
        children: [
            /*#__PURE__*/ _jsx(SidebarTrigger, {
                className: "-ml-1"
            }),
            breadcrumbs.length > 0 && /*#__PURE__*/ _jsxs(_Fragment, {
                children: [
                    /*#__PURE__*/ _jsx(Separator, {
                        orientation: "vertical",
                        className: "mr-2 h-4"
                    }),
                    /*#__PURE__*/ _jsx(Breadcrumb, {
                        children: /*#__PURE__*/ _jsx(BreadcrumbList, {
                            children: breadcrumbs.map((crumb, i)=>{
                                const isLast = i === breadcrumbs.length - 1;
                                return /*#__PURE__*/ _jsxs(React.Fragment, {
                                    children: [
                                        /*#__PURE__*/ _jsx(BreadcrumbItem, {
                                            children: isLast || !crumb.href ? /*#__PURE__*/ _jsx(BreadcrumbPage, {
                                                children: crumb.label
                                            }) : /*#__PURE__*/ _jsx(BreadcrumbLink, {
                                                href: crumb.href,
                                                children: crumb.label
                                            })
                                        }),
                                        !isLast && /*#__PURE__*/ _jsx(BreadcrumbSeparator, {})
                                    ]
                                }, `${crumb.label}-${i}`);
                            })
                        })
                    })
                ]
            }),
            actions
        ]
    });
}

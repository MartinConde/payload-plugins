'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from './utils.js';
import { ViewHeader } from './ViewHeader.js';
/* Standard wrapper for a custom Payload admin view. Scopes Tailwind preflight
   via .twp, mounts the sidebar trigger + breadcrumb header, and provides a
   padded content slot. Pass contentClassName="p-0" for full-bleed layouts. */ export function ViewShell({ breadcrumbs, children, className, contentClassName, headerActions }) {
    return /*#__PURE__*/ _jsxs("div", {
        className: cn('twp flex flex-1 flex-col', className),
        children: [
            /*#__PURE__*/ _jsx(ViewHeader, {
                breadcrumbs: breadcrumbs,
                actions: headerActions
            }),
            /*#__PURE__*/ _jsx("div", {
                className: cn('space-y-4 p-6', contentClassName),
                children: children
            })
        ]
    });
}

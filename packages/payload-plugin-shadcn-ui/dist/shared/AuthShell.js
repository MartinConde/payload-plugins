'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Centered-card shell for Payload's PRE-AUTH views (login, create-first-user,
   forgot-password, logout, unauthorized). Unlike `ViewShell`, it does NOT
   render the sidebar trigger / breadcrumb header — those views render before a
   user session exists and have no document context. Payload still wraps these
   routes in its passive `MinimalTemplate` (`.template-minimal__wrap`); the
   `.shadcn-auth-view` marker lets `styles.css` neutralize that wrapper so the
   card centers on a full-height themed background (mirrors the
   `.shadcn-auto-doc-view` chrome-hiding precedent). */ import * as React from 'react';
import { cn } from './utils.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
export function AuthShell({ brand, title, description, children, footer, className }) {
    return /*#__PURE__*/ _jsxs("div", {
        className: cn('twp shadcn-auth-view flex min-h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-background p-6', className),
        children: [
            brand ? /*#__PURE__*/ _jsx("div", {
                className: "flex flex-col items-center gap-2 text-center",
                children: brand
            }) : null,
            /*#__PURE__*/ _jsxs(Card, {
                className: "w-full max-w-sm",
                children: [
                    title || description ? /*#__PURE__*/ _jsxs(CardHeader, {
                        children: [
                            title ? /*#__PURE__*/ _jsx(CardTitle, {
                                className: "text-xl",
                                children: title
                            }) : null,
                            description ? /*#__PURE__*/ _jsx(CardDescription, {
                                children: description
                            }) : null
                        ]
                    }) : null,
                    /*#__PURE__*/ _jsx(CardContent, {
                        className: "flex flex-col gap-4",
                        children: children
                    })
                ]
            }),
            footer ? /*#__PURE__*/ _jsx("div", {
                className: "text-center text-sm text-muted-foreground",
                children: footer
            }) : null
        ]
    });
}

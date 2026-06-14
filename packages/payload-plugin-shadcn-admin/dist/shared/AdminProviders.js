'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { SidebarProvider } from 'payload-plugin-shadcn-ui';
import { SkippedDocViewsBanner } from './SkippedDocViewsBanner.js';
/* Blocking script that applies the saved theme-flavor to <html> DURING HTML
   parse — before any themed content paints — so vibrant users don't see a
   minimal→vibrant flash on full page loads. Mirrors next-themes' approach.
   It runs once on initial load; runtime switching and re-applying after soft
   navigation are handled by UiFlavorProvider (mounted in the sidebar). Reads
   the same localStorage key the provider writes. */ const FLAVOR_BOOT_SCRIPT = `try{var f=localStorage.getItem('shadcn-admin-ui-theme');document.documentElement.dataset.uiTheme=f==='vibrant'?'vibrant':'minimal';}catch(e){}`;
/* Hoist shadcn's SidebarProvider above the entire admin so that the Sidebar
   (rendered in the Nav slot) and SidebarTrigger (rendered inside views) share
   the same React context. display:contents makes the wrapper layout-neutral
   so Payload's own DOM flow is preserved; CSS custom properties set inline by
   SidebarProvider still cascade to descendants.

   The flavor context provider itself (UiFlavorProvider) lives in
   DefaultAdminSidebar, not here — see ThemeProvider.tsx.

   The boot <script> is rendered ONLY during the server pass (`typeof window ===
   'undefined'`). It must reach the initial SSR HTML to run before paint, but
   re-rendering an inline <script> on the CLIENT (hydration / soft nav) trips
   React 19's "scripts inside React components are never executed when rendering
   on the client" error. Payload mounts this in its client provider chain, so a
   server-component split doesn't escape the client render — the env guard does.
   React keeps the already-parsed server <script> in the DOM; the client simply
   never re-emits it. */ export default function AdminProviders({ children }) {
    return /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
            typeof window === 'undefined' ? /*#__PURE__*/ _jsx("script", {
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML: {
                    __html: FLAVOR_BOOT_SCRIPT
                }
            }) : null,
            /*#__PURE__*/ _jsxs(SidebarProvider, {
                style: {
                    display: 'contents'
                },
                children: [
                    children,
                    /*#__PURE__*/ _jsx(SkippedDocViewsBanner, {})
                ]
            })
        ]
    });
}

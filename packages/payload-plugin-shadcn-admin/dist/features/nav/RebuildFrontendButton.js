'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { RotateCw } from 'lucide-react';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from 'payload-plugin-shadcn-ui';
import { formatAdminURL, toast, useConfig } from '../../internal/payloadAdapter.js';
export function RebuildFrontendButton({ label, endpointPath }) {
    const { config } = useConfig();
    const apiRoute = config.routes?.api;
    const serverURL = config.serverURL;
    const [loading, setLoading] = React.useState(false);
    const handleClick = React.useCallback(async ()=>{
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch(formatAdminURL({
                apiRoute,
                path: endpointPath,
                serverURL: serverURL || ''
            }), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const body = await res.json().catch(()=>({}));
            if (res.ok) {
                toast.success(label + ' triggered');
            } else {
                toast.error(typeof body.error === 'string' ? body.error : `Request failed (${res.status})`);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Rebuild request failed');
        } finally{
            setLoading(false);
        }
    }, [
        loading,
        apiRoute,
        endpointPath,
        serverURL,
        label
    ]);
    return /*#__PURE__*/ _jsx(SidebarMenu, {
        children: /*#__PURE__*/ _jsx(SidebarMenuItem, {
            children: /*#__PURE__*/ _jsxs(SidebarMenuButton, {
                tooltip: label,
                disabled: loading,
                onClick: handleClick,
                children: [
                    /*#__PURE__*/ _jsx(RotateCw, {
                        className: loading ? 'animate-spin' : ''
                    }),
                    /*#__PURE__*/ _jsx("span", {
                        children: loading ? 'Rebuilding…' : label
                    })
                ]
            })
        })
    });
}

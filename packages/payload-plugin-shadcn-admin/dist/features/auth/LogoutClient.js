'use client';
import { jsx as _jsx } from "react/jsx-runtime";
/* shadcn-styled replacement for Payload's `LogoutClient`
   (node_modules/@payloadcms/next/dist/views/Logout/LogoutClient.js).
   - Normal logout: calls `useAuth().logOut()` once on mount, toasts success,
     then redirects to the login route.
   - Inactivity logout: the session is already cleared upstream, so it just
     shows the "logged out due to inactivity" notice + a "log back in" button. */ import * as React from 'react';
import { useRouter } from 'next/navigation.js';
import { toast, useAuth, useConfig, useTranslation } from '../../internal/payloadAdapter.js';
import { formatAdminURL } from '../../internal/payloadAdapter.js';
import { AuthShell } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
export function LogoutClient({ inactivity, redirect }) {
    const { config } = useConfig();
    const { admin: { routes: { login: loginRoute } }, routes: { admin: adminRoute } } = config;
    const { logOut, user } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const ranRef = React.useRef(false);
    const loginURL = formatAdminURL({
        adminRoute,
        path: loginRoute
    }) + (redirect ? `?redirect=${encodeURIComponent(redirect)}` : '');
    React.useEffect(()=>{
        if (inactivity) return;
        if (ranRef.current) return;
        ranRef.current = true;
        void (async ()=>{
            await logOut();
            toast.success(t('authentication:loggedOutSuccessfully'));
            router.push(loginURL);
        })();
    }, [
        inactivity,
        logOut,
        router,
        t,
        loginURL
    ]);
    if (inactivity) {
        return /*#__PURE__*/ _jsx(AuthShell, {
            title: t('authentication:loggedOutInactivity'),
            children: /*#__PURE__*/ _jsx(Button, {
                asChild: true,
                className: "w-full",
                children: /*#__PURE__*/ _jsx("a", {
                    href: loginURL,
                    children: t('authentication:logBackIn')
                })
            })
        });
    }
    return /*#__PURE__*/ _jsx(AuthShell, {
        title: t('authentication:loggingOut'),
        children: /*#__PURE__*/ _jsx("p", {
            className: "text-sm text-muted-foreground",
            children: user ? t('authentication:loggingOut') : t('authentication:loggedOutSuccessfully')
        })
    });
}

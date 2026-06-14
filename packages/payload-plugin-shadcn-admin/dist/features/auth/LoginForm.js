'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* shadcn-styled replacement for Payload's `LoginForm`
   (node_modules/@payloadcms/next/dist/views/Login/LoginForm/index.js).
   Functionally 1:1: POSTs to `{apiRoute}/{userSlug}/login`, calls
   `useAuth().setUser(data)` on success, then redirects to the validated
   `?redirect` target (falling back to the admin route). Login field is
   email / username / emailOrUsername per the user collection's auth options.
   Rendered with vendored shadcn primitives inside the AuthShell card instead
   of Payload's `Form`/`PasswordField` chrome. */ import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation.js';
import { toast, useAuth, useConfig, useTranslation } from '../../internal/payloadAdapter.js';
import { formatAdminURL, getSafeRedirect } from '../../internal/payloadAdapter.js';
import { AuthShell } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Label } from 'payload-plugin-shadcn-ui';
export function LoginForm({ beforeLogin, afterLogin }) {
    const { config, getEntityConfig } = useConfig();
    const { admin: { routes: { forgot: forgotRoute }, user: userSlug }, routes: { admin: adminRoute, api: apiRoute } } = config;
    const { t } = useTranslation();
    const { setUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const collectionConfig = getEntityConfig({
        collectionSlug: userSlug
    });
    const loginWithUsername = collectionConfig?.auth?.loginWithUsername;
    const canLoginWithEmail = !loginWithUsername || loginWithUsername.allowEmailLogin;
    const canLoginWithUsername = Boolean(loginWithUsername);
    const loginType = canLoginWithEmail && canLoginWithUsername ? 'emailOrUsername' : canLoginWithUsername ? 'username' : 'email';
    const [identifier, setIdentifier] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const redirectTarget = getSafeRedirect({
        fallbackTo: adminRoute,
        redirectTo: searchParams?.get('redirect') ?? undefined
    });
    const loginLabel = loginType === 'email' ? t('general:email') : loginType === 'username' ? t('authentication:username') : t('authentication:emailOrUsername');
    const onSubmit = async (e)=>{
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const body = {
                password
            };
            // emailOrUsername: Payload's login endpoint accepts either key; pick
            // `email` when the value looks like an address, otherwise `username`.
            if (loginType === 'username') body.username = identifier;
            else if (loginType === 'email') body.email = identifier;
            else if (identifier.includes('@')) body.email = identifier;
            else body.username = identifier;
            const res = await fetch(formatAdminURL({
                apiRoute,
                path: `/${userSlug}/login`
            }), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const json = await res.json().catch(()=>({}));
            if (!res.ok || !json.user) {
                const message = json.errors?.[0]?.message ?? json.message ?? t('error:unknown');
                setError(message);
                toast.error(message);
                return;
            }
            setUser(json);
            router.push(redirectTarget);
        } catch  {
            const message = t('error:unknown');
            setError(message);
            toast.error(message);
        } finally{
            setLoading(false);
        }
    };
    return /*#__PURE__*/ _jsxs(AuthShell, {
        title: t('authentication:login'),
        children: [
            beforeLogin,
            /*#__PURE__*/ _jsxs("form", {
                onSubmit: onSubmit,
                className: "flex flex-col gap-4",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex flex-col gap-1.5",
                        children: [
                            /*#__PURE__*/ _jsx(Label, {
                                htmlFor: "login-identifier",
                                children: loginLabel
                            }),
                            /*#__PURE__*/ _jsx(Input, {
                                id: "login-identifier",
                                type: loginType === 'email' ? 'email' : 'text',
                                autoComplete: loginType === 'username' ? 'username' : 'email',
                                value: identifier,
                                onChange: (e)=>setIdentifier(e.target.value),
                                required: true,
                                disabled: loading,
                                "aria-invalid": error ? true : undefined
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex flex-col gap-1.5",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ _jsx(Label, {
                                        htmlFor: "login-password",
                                        children: t('general:password')
                                    }),
                                    /*#__PURE__*/ _jsx("a", {
                                        href: formatAdminURL({
                                            adminRoute,
                                            path: forgotRoute
                                        }),
                                        className: "text-sm text-muted-foreground underline-offset-4 hover:underline",
                                        children: t('authentication:forgotPasswordQuestion')
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsx(Input, {
                                id: "login-password",
                                type: "password",
                                autoComplete: "current-password",
                                value: password,
                                onChange: (e)=>setPassword(e.target.value),
                                required: true,
                                disabled: loading,
                                "aria-invalid": error ? true : undefined
                            })
                        ]
                    }),
                    error ? /*#__PURE__*/ _jsx("p", {
                        className: "text-sm text-destructive",
                        children: error
                    }) : null,
                    /*#__PURE__*/ _jsx(Button, {
                        type: "submit",
                        className: "w-full",
                        disabled: loading,
                        children: loading ? `${t('authentication:login')}…` : t('authentication:login')
                    })
                ]
            }),
            afterLogin
        ]
    });
}

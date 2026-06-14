'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* shadcn-styled replacement for Payload's `ForgotPasswordForm`
   (node_modules/@payloadcms/next/dist/views/ForgotPassword/ForgotPasswordForm).
   POSTs to `{apiRoute}/{userSlug}/forgot-password` with `email` (or `username`
   when the collection logs in with usernames). On success it swaps to an
   "email sent" confirmation. The actual reset link in the email still routes to
   Payload's default reset view — that view isn't overridable in 3.84.1. */ import * as React from 'react';
import { toast, useConfig, useTranslation } from '../../internal/payloadAdapter.js';
import { formatAdminURL } from '../../internal/payloadAdapter.js';
import { AuthShell } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Label } from 'payload-plugin-shadcn-ui';
export function ForgotPasswordForm() {
    const { config, getEntityConfig } = useConfig();
    const { admin: { routes: { login: loginRoute }, user: userSlug }, routes: { admin: adminRoute, api: apiRoute } } = config;
    const { t } = useTranslation();
    const collectionConfig = getEntityConfig({
        collectionSlug: userSlug
    });
    const loginWithUsername = Boolean(collectionConfig?.auth?.loginWithUsername);
    const [value, setValue] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [submitted, setSubmitted] = React.useState(false);
    const onSubmit = async (e)=>{
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(formatAdminURL({
                apiRoute,
                path: `/${userSlug}/forgot-password`
            }), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginWithUsername ? {
                    username: value
                } : {
                    email: value
                })
            });
            if (!res.ok) {
                const message = loginWithUsername ? t('authentication:usernameNotValid') : t('authentication:emailNotValid');
                setError(message);
                toast.error(message);
                return;
            }
            setSubmitted(true);
            toast.success(t('general:submissionSuccessful'));
        } catch  {
            const message = t('error:unknown');
            setError(message);
            toast.error(message);
        } finally{
            setLoading(false);
        }
    };
    if (submitted) {
        return /*#__PURE__*/ _jsx(AuthShell, {
            title: t('authentication:emailSent'),
            description: t('authentication:checkYourEmailForPasswordReset'),
            footer: /*#__PURE__*/ _jsx("a", {
                className: "underline-offset-4 hover:underline",
                href: formatAdminURL({
                    adminRoute,
                    path: loginRoute
                }),
                children: t('authentication:backToLogin')
            }),
            children: /*#__PURE__*/ _jsx("span", {})
        });
    }
    return /*#__PURE__*/ _jsx(AuthShell, {
        title: t('authentication:forgotPassword'),
        description: loginWithUsername ? t('authentication:forgotPasswordUsernameInstructions') : t('authentication:forgotPasswordEmailInstructions'),
        footer: /*#__PURE__*/ _jsx("a", {
            className: "underline-offset-4 hover:underline",
            href: formatAdminURL({
                adminRoute,
                path: loginRoute
            }),
            children: t('authentication:backToLogin')
        }),
        children: /*#__PURE__*/ _jsxs("form", {
            onSubmit: onSubmit,
            className: "flex flex-col gap-4",
            children: [
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-col gap-1.5",
                    children: [
                        /*#__PURE__*/ _jsx(Label, {
                            htmlFor: "forgot-identifier",
                            children: loginWithUsername ? t('authentication:username') : t('general:email')
                        }),
                        /*#__PURE__*/ _jsx(Input, {
                            id: "forgot-identifier",
                            type: loginWithUsername ? 'text' : 'email',
                            autoComplete: loginWithUsername ? 'username' : 'email',
                            value: value,
                            onChange: (e)=>setValue(e.target.value),
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
                    children: loading ? `${t('general:submit')}…` : t('general:submit')
                })
            ]
        })
    });
}

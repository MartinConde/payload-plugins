'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* shadcn-styled replacement for Payload's `CreateFirstUserClient`
   (node_modules/@payloadcms/next/dist/views/CreateFirstUser/index.client.js).
   POSTs to `{apiRoute}/{userSlug}/first-register` with the collection's fields
   (incl. the synthesized `email`) plus `password`, then `setUser(data)` and
   redirects to the admin root. Renders the user collection's own fields via the
   shared FieldList so the first account can set fields like `roles`. */ import * as React from 'react';
import { useRouter } from 'next/navigation.js';
import { toast, useAuth, useConfig, useTranslation } from '../../internal/payloadAdapter.js';
import { formatAdminURL } from '../../internal/payloadAdapter.js';
import { AuthShell } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Label } from 'payload-plugin-shadcn-ui';
import { FieldList, setByPath } from './FieldList.js';
export function CreateFirstUserForm({ userSlug, fields, useAsTitleBySlug, initialValues }) {
    const { config } = useConfig();
    const { routes: { admin: adminRoute, api: apiRoute } } = config;
    const { t } = useTranslation();
    const { setUser } = useAuth();
    const router = useRouter();
    const [values, setValues] = React.useState(initialValues);
    const [password, setPassword] = React.useState('');
    const [confirm, setConfirm] = React.useState('');
    const [errors, setErrors] = React.useState({});
    const [topError, setTopError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const onChange = (path, next)=>{
        setValues((prev)=>setByPath(prev, path, next));
        setErrors((prev)=>{
            if (!(path in prev)) return prev;
            const copy = {
                ...prev
            };
            delete copy[path];
            return copy;
        });
    };
    const onSubmit = async (e)=>{
        e.preventDefault();
        if (loading) return;
        const nextErrors = {};
        if (!password) nextErrors.__password = t('validation:required');
        if (!confirm) nextErrors.__confirm = t('validation:required');
        if (password && confirm && password !== confirm) {
            nextErrors.__confirm = t('fields:passwordsDoNotMatch');
        }
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }
        setLoading(true);
        setTopError(null);
        try {
            const res = await fetch(formatAdminURL({
                apiRoute,
                path: `/${userSlug}/first-register`
            }), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...values,
                    password
                })
            });
            const json = await res.json().catch(()=>({}));
            if (!res.ok || !json.user) {
                const message = json.errors?.[0]?.message ?? json.message ?? t('error:unknown');
                setTopError(message);
                toast.error(message);
                return;
            }
            setUser(json);
            router.push(adminRoute);
        } catch  {
            const message = t('error:unknown');
            setTopError(message);
            toast.error(message);
        } finally{
            setLoading(false);
        }
    };
    return /*#__PURE__*/ _jsx(AuthShell, {
        title: t('general:welcome'),
        description: t('authentication:beginCreateFirstUser'),
        children: /*#__PURE__*/ _jsxs("form", {
            onSubmit: onSubmit,
            className: "flex flex-col gap-4",
            children: [
                topError ? /*#__PURE__*/ _jsx("div", {
                    className: "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive",
                    children: topError
                }) : null,
                /*#__PURE__*/ _jsx(FieldList, {
                    fields: fields,
                    values: values,
                    errors: errors,
                    onChange: onChange,
                    useAsTitleBySlug: useAsTitleBySlug,
                    disabled: loading,
                    operation: "create"
                }),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-col gap-1.5",
                    children: [
                        /*#__PURE__*/ _jsxs(Label, {
                            htmlFor: "first-user-password",
                            children: [
                                t('authentication:newPassword'),
                                /*#__PURE__*/ _jsx("span", {
                                    className: "text-destructive",
                                    "aria-hidden": "true",
                                    children: "*"
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsx(Input, {
                            id: "first-user-password",
                            type: "password",
                            autoComplete: "new-password",
                            value: password,
                            onChange: (e)=>{
                                setPassword(e.target.value);
                                setErrors((p)=>({
                                        ...p,
                                        __password: ''
                                    }));
                            },
                            required: true,
                            disabled: loading,
                            "aria-invalid": errors.__password ? true : undefined
                        }),
                        errors.__password ? /*#__PURE__*/ _jsx("p", {
                            className: "text-xs text-destructive",
                            children: errors.__password
                        }) : null
                    ]
                }),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-col gap-1.5",
                    children: [
                        /*#__PURE__*/ _jsxs(Label, {
                            htmlFor: "first-user-confirm",
                            children: [
                                t('authentication:confirmPassword'),
                                /*#__PURE__*/ _jsx("span", {
                                    className: "text-destructive",
                                    "aria-hidden": "true",
                                    children: "*"
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsx(Input, {
                            id: "first-user-confirm",
                            type: "password",
                            autoComplete: "new-password",
                            value: confirm,
                            onChange: (e)=>{
                                setConfirm(e.target.value);
                                setErrors((p)=>({
                                        ...p,
                                        __confirm: ''
                                    }));
                            },
                            required: true,
                            disabled: loading,
                            "aria-invalid": errors.__confirm ? true : undefined
                        }),
                        errors.__confirm ? /*#__PURE__*/ _jsx("p", {
                            className: "text-xs text-destructive",
                            children: errors.__confirm
                        }) : null
                    ]
                }),
                /*#__PURE__*/ _jsx(Button, {
                    type: "submit",
                    className: "w-full",
                    disabled: loading,
                    children: loading ? `${t('general:create')}…` : t('general:create')
                })
            ]
        })
    });
}

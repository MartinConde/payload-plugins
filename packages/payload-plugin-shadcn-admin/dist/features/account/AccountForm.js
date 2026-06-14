'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* shadcn-styled replacement for Payload's Account view body. Account is the
   logged-in user's own record — effectively an edit form for the auth
   collection's current doc. Unlike the per-collection doc view (which excludes
   auth-synthesized fields), Account surfaces the auth-specific controls Payload
   renders here: a change-password form, the API-key panel (when
   `auth.useAPIKey`), and the email-verification state (when `auth.verify`).

   It is purpose-built rather than reusing AutoCollectionDocView so the doc view
   stays untouched. Profile fields render through the shared FieldList; each
   concern (profile / password / API key) PATCHes `/api/{userSlug}/{id}`
   independently and refreshes on success. */ import * as React from 'react';
import { useRouter } from 'next/navigation.js';
import { Check, Copy } from 'lucide-react';
import { toast, useTranslation } from '../../internal/payloadAdapter.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Label } from 'payload-plugin-shadcn-ui';
import { Badge } from 'payload-plugin-shadcn-ui';
import { Checkbox } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { FieldList, setByPath } from '../auth/FieldList.js';
/* Collect renderable top-level field names (flattening transparent row/
   collapsible and named tabs) so the profile PATCH ships only real keys. */ const collectTopLevelNames = (fields)=>{
    const out = [];
    const visit = (list)=>{
        for (const f of list){
            if (f.type === 'row' || f.type === 'collapsible') {
                if (f.fields) visit(f.fields);
                continue;
            }
            if (f.type === 'tabs') {
                for (const tab of f.tabs ?? []){
                    if (tab.name) out.push(tab.name);
                    else visit(tab.fields);
                }
                continue;
            }
            if (f.name) out.push(f.name);
        }
    };
    visit(fields);
    return out;
};
const SYSTEM = new Set([
    'id',
    'createdAt',
    'updatedAt',
    '_status',
    'salt',
    'hash',
    'sessions',
    'loginAttempts',
    'lockUntil',
    'resetPasswordToken',
    'resetPasswordExpiration',
    'enableAPIKey',
    'apiKey',
    'apiKeyIndex',
    '_verified',
    '_verificationToken'
]);
export function AccountForm({ userSlug, userId, fields, initialValues, useAsTitleBySlug, docPermissions, useAPIKey, verify, verified, initialApiKey, initialEnableAPIKey, languageOptions = [] }) {
    const { t, i18n, switchLanguage } = useTranslation();
    const router = useRouter();
    const endpoint = `/api/${userSlug}/${userId}`;
    // ── Profile ────────────────────────────────────────────────────────────
    const [values, setValues] = React.useState(initialValues);
    const [fieldErrors, setFieldErrors] = React.useState({});
    const [savingProfile, setSavingProfile] = React.useState(false);
    const onFieldChange = (path, next)=>{
        setValues((prev)=>setByPath(prev, path, next));
        setFieldErrors((prev)=>{
            if (!(path in prev)) return prev;
            const copy = {
                ...prev
            };
            delete copy[path];
            return copy;
        });
    };
    const patch = async (body)=>{
        const res = await fetch(endpoint, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const json = await res.json().catch(()=>({}));
            toast.error(json.errors?.[0]?.message ?? json.message ?? t('error:unknown'));
            return false;
        }
        return true;
    };
    const saveProfile = async ()=>{
        if (savingProfile) return;
        setSavingProfile(true);
        try {
            const body = {};
            for (const name of collectTopLevelNames(fields)){
                if (SYSTEM.has(name)) continue;
                if (values[name] !== undefined) body[name] = values[name];
            }
            if (await patch(body)) {
                toast.success(t('general:updatedSuccessfully'));
                router.refresh();
            }
        } finally{
            setSavingProfile(false);
        }
    };
    // ── Password ─────────────────────────────────────────────────────────────
    const [password, setPassword] = React.useState('');
    const [confirm, setConfirm] = React.useState('');
    const [pwError, setPwError] = React.useState(null);
    const [savingPw, setSavingPw] = React.useState(false);
    const savePassword = async ()=>{
        if (savingPw) return;
        if (!password) {
            setPwError(t('validation:required'));
            return;
        }
        if (password !== confirm) {
            setPwError(t('fields:passwordsDoNotMatch'));
            return;
        }
        setSavingPw(true);
        setPwError(null);
        try {
            if (await patch({
                password
            })) {
                toast.success(t('general:updatedSuccessfully'));
                setPassword('');
                setConfirm('');
                router.refresh();
            }
        } finally{
            setSavingPw(false);
        }
    };
    // ── API key ────────────────────────────────────────────────────────────
    const [enabled, setEnabled] = React.useState(Boolean(initialEnableAPIKey));
    const [apiKey, setApiKey] = React.useState(initialApiKey ?? null);
    const [keyBusy, setKeyBusy] = React.useState(false);
    const [copied, setCopied] = React.useState(false);
    const toggleApiKey = async (next)=>{
        if (keyBusy) return;
        setKeyBusy(true);
        try {
            if (next) {
                const key = crypto.randomUUID();
                if (await patch({
                    enableAPIKey: true,
                    apiKey: key
                })) {
                    setEnabled(true);
                    setApiKey(key);
                    router.refresh();
                }
            } else if (await patch({
                enableAPIKey: false
            })) {
                setEnabled(false);
                setApiKey(null);
                router.refresh();
            }
        } finally{
            setKeyBusy(false);
        }
    };
    const regenerate = async ()=>{
        if (keyBusy) return;
        setKeyBusy(true);
        try {
            const key = crypto.randomUUID();
            if (await patch({
                enableAPIKey: true,
                apiKey: key
            })) {
                setEnabled(true);
                setApiKey(key);
                router.refresh();
            }
        } finally{
            setKeyBusy(false);
        }
    };
    const copyKey = async ()=>{
        if (!apiKey) return;
        try {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(()=>setCopied(false), 1500);
        } catch  {
            toast.error(t('error:unknown'));
        }
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex max-w-2xl flex-col gap-6",
        children: [
            /*#__PURE__*/ _jsxs(Card, {
                children: [
                    /*#__PURE__*/ _jsxs(CardHeader, {
                        children: [
                            /*#__PURE__*/ _jsx(CardTitle, {
                                children: t('authentication:account')
                            }),
                            verify ? /*#__PURE__*/ _jsx(CardDescription, {
                                children: verified ? /*#__PURE__*/ _jsx(Badge, {
                                    variant: "secondary",
                                    children: t('authentication:verified')
                                }) : /*#__PURE__*/ _jsx(Badge, {
                                    variant: "outline",
                                    children: t('authentication:verify')
                                })
                            }) : null
                        ]
                    }),
                    /*#__PURE__*/ _jsxs(CardContent, {
                        className: "flex flex-col gap-4",
                        children: [
                            /*#__PURE__*/ _jsx(FieldList, {
                                fields: fields,
                                values: values,
                                errors: fieldErrors,
                                onChange: onFieldChange,
                                useAsTitleBySlug: useAsTitleBySlug,
                                docPermissions: docPermissions,
                                disabled: savingProfile,
                                operation: "update"
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "flex justify-end",
                                children: /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    onClick: saveProfile,
                                    disabled: savingProfile,
                                    children: savingProfile ? `${t('general:save')}…` : t('general:save')
                                })
                            })
                        ]
                    })
                ]
            }),
            languageOptions.length > 1 && switchLanguage ? /*#__PURE__*/ _jsxs(Card, {
                children: [
                    /*#__PURE__*/ _jsx(CardHeader, {
                        children: /*#__PURE__*/ _jsx(CardTitle, {
                            children: t('general:language')
                        })
                    }),
                    /*#__PURE__*/ _jsx(CardContent, {
                        children: /*#__PURE__*/ _jsxs(Select, {
                            value: i18n.language,
                            onValueChange: (value)=>{
                                void switchLanguage?.(value);
                            },
                            children: [
                                /*#__PURE__*/ _jsx(SelectTrigger, {
                                    id: "account-language",
                                    className: "w-full sm:w-72",
                                    children: /*#__PURE__*/ _jsx(SelectValue, {})
                                }),
                                /*#__PURE__*/ _jsx(SelectContent, {
                                    children: languageOptions.map((opt)=>/*#__PURE__*/ _jsx(SelectItem, {
                                            value: opt.value,
                                            children: opt.label
                                        }, opt.value))
                                })
                            ]
                        })
                    })
                ]
            }) : null,
            /*#__PURE__*/ _jsxs(Card, {
                children: [
                    /*#__PURE__*/ _jsx(CardHeader, {
                        children: /*#__PURE__*/ _jsx(CardTitle, {
                            children: t('authentication:changePassword')
                        })
                    }),
                    /*#__PURE__*/ _jsxs(CardContent, {
                        className: "flex flex-col gap-4",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex flex-col gap-1.5",
                                children: [
                                    /*#__PURE__*/ _jsx(Label, {
                                        htmlFor: "account-new-password",
                                        children: t('authentication:newPassword')
                                    }),
                                    /*#__PURE__*/ _jsx(Input, {
                                        id: "account-new-password",
                                        type: "password",
                                        autoComplete: "new-password",
                                        value: password,
                                        onChange: (e)=>{
                                            setPassword(e.target.value);
                                            setPwError(null);
                                        },
                                        disabled: savingPw,
                                        "aria-invalid": pwError ? true : undefined
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex flex-col gap-1.5",
                                children: [
                                    /*#__PURE__*/ _jsx(Label, {
                                        htmlFor: "account-confirm-password",
                                        children: t('authentication:confirmPassword')
                                    }),
                                    /*#__PURE__*/ _jsx(Input, {
                                        id: "account-confirm-password",
                                        type: "password",
                                        autoComplete: "new-password",
                                        value: confirm,
                                        onChange: (e)=>{
                                            setConfirm(e.target.value);
                                            setPwError(null);
                                        },
                                        disabled: savingPw,
                                        "aria-invalid": pwError ? true : undefined
                                    })
                                ]
                            }),
                            pwError ? /*#__PURE__*/ _jsx("p", {
                                className: "text-sm text-destructive",
                                children: pwError
                            }) : null,
                            /*#__PURE__*/ _jsx("div", {
                                className: "flex justify-end",
                                children: /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    variant: "secondary",
                                    onClick: savePassword,
                                    disabled: savingPw || !password,
                                    children: savingPw ? `${t('authentication:changePassword')}…` : t('authentication:changePassword')
                                })
                            })
                        ]
                    })
                ]
            }),
            useAPIKey ? /*#__PURE__*/ _jsxs(Card, {
                children: [
                    /*#__PURE__*/ _jsx(CardHeader, {
                        children: /*#__PURE__*/ _jsx(CardTitle, {
                            children: t('authentication:apiKey')
                        })
                    }),
                    /*#__PURE__*/ _jsxs(CardContent, {
                        className: "flex flex-col gap-4",
                        children: [
                            /*#__PURE__*/ _jsxs("label", {
                                className: "flex items-center gap-2 text-sm",
                                children: [
                                    /*#__PURE__*/ _jsx(Checkbox, {
                                        checked: enabled,
                                        disabled: keyBusy,
                                        onCheckedChange: (c)=>void toggleApiKey(Boolean(c))
                                    }),
                                    t('authentication:enableAPIKey')
                                ]
                            }),
                            enabled && apiKey ? /*#__PURE__*/ _jsxs("div", {
                                className: "flex flex-col gap-1.5",
                                children: [
                                    /*#__PURE__*/ _jsx(Label, {
                                        htmlFor: "account-api-key",
                                        children: t('authentication:apiKey')
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ _jsx(Input, {
                                                id: "account-api-key",
                                                readOnly: true,
                                                value: apiKey,
                                                className: "font-mono"
                                            }),
                                            /*#__PURE__*/ _jsx(Button, {
                                                type: "button",
                                                variant: "outline",
                                                size: "icon",
                                                "aria-label": "Copy API key",
                                                onClick: copyKey,
                                                children: copied ? /*#__PURE__*/ _jsx(Check, {
                                                    className: "size-4"
                                                }) : /*#__PURE__*/ _jsx(Copy, {
                                                    className: "size-4"
                                                })
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "flex justify-end pt-1",
                                        children: /*#__PURE__*/ _jsx(Button, {
                                            type: "button",
                                            variant: "secondary",
                                            size: "sm",
                                            onClick: regenerate,
                                            disabled: keyBusy,
                                            children: t('authentication:generateNewAPIKey')
                                        })
                                    })
                                ]
                            }) : null
                        ]
                    })
                ]
            }) : null
        ]
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Check, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { toast, useConfig, useDocumentInfo, useLocale, useTranslation } from '../../../internal/payloadAdapter.js';
import { useSearchParams } from 'next/navigation.js';
import { formatAdminURL, hasDraftsEnabled } from '../../../internal/payloadAdapter.js';
import { Checkbox } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { RenderJson } from './RenderJson.js';
/* shadcn-styled replacement for Payload's `APIViewClient`
   (node_modules/@payloadcms/next/dist/views/API/index.client.js). Functionally
   1:1 — same fetch URL/params, same `credentials` toggle, same Accept-Language
   header, same defaults — but rendered with the plugin's shadcn primitives and
   layout instead of Payload's `Form`/`Gutter`/`CheckboxField` chrome. Mounted
   by AutoApiView inside the shadcn doc-view shell. */ export function ApiInspector() {
    const { id, collectionSlug, globalSlug, initialData, isTrashed } = useDocumentInfo();
    const searchParams = useSearchParams();
    const { i18n, t } = useTranslation();
    const { code } = useLocale();
    const { config: { defaultDepth, localization, routes: { api: apiRoute }, serverURL }, getEntityConfig } = useConfig();
    const collectionConfig = getEntityConfig({
        collectionSlug
    });
    const globalConfig = getEntityConfig({
        globalSlug
    });
    const localeOptions = localization && localization.locales.map((locale)=>({
            label: typeof locale.label === 'string' ? locale.label : locale.code,
            value: locale.code
        }));
    let draftsEnabled = false;
    let docEndpoint = undefined;
    if (collectionConfig) {
        draftsEnabled = hasDraftsEnabled(collectionConfig);
        docEndpoint = `/${collectionSlug}/${id}`;
    }
    if (globalConfig) {
        draftsEnabled = hasDraftsEnabled(globalConfig);
        docEndpoint = `/globals/${globalSlug}`;
    }
    const [data, setData] = React.useState(initialData);
    const [draft, setDraft] = React.useState(searchParams.get('draft') === 'true');
    const [locale, setLocale] = React.useState(searchParams?.get('locale') || code);
    const [depth, setDepth] = React.useState(searchParams.get('depth') || defaultDepth.toString());
    const [authenticated, setAuthenticated] = React.useState(true);
    const [fullscreen, setFullscreen] = React.useState(false);
    const [origin, setOrigin] = React.useState(serverURL || '');
    const [copied, setCopied] = React.useState(false);
    // Set origin to window.location.origin in an effect to avoid hydration errors.
    React.useEffect(()=>{
        if (!serverURL) {
            setOrigin(window.location.origin);
        }
    }, [
        serverURL
    ]);
    const trashParam = typeof initialData?.deletedAt === 'string';
    const params = new URLSearchParams({
        depth,
        draft: String(draft),
        locale,
        trash: trashParam ? 'true' : 'false'
    }).toString();
    const fetchURL = formatAdminURL({
        apiRoute,
        path: `${docEndpoint}?${params}`,
        serverURL: origin
    });
    React.useEffect(()=>{
        const fetchData = async ()=>{
            try {
                const res = await fetch(fetchURL, {
                    credentials: authenticated ? 'include' : 'omit',
                    headers: {
                        'Accept-Language': i18n.language
                    },
                    method: 'GET'
                });
                try {
                    const json = await res.json();
                    setData(json);
                } catch (error) {
                    toast.error('Error parsing response');
                    console.error(error); // eslint-disable-line no-console
                }
            } catch (error) {
                toast.error('Error making request');
                console.error(error); // eslint-disable-line no-console
            }
        };
        void fetchData();
    }, [
        i18n.language,
        fetchURL,
        authenticated
    ]);
    const handleCopy = React.useCallback(async ()=>{
        try {
            await navigator.clipboard.writeText(fetchURL);
            setCopied(true);
            setTimeout(()=>setCopied(false), 1500);
        } catch  {
            toast.error('Could not copy to clipboard');
        }
    }, [
        fetchURL
    ]);
    return /*#__PURE__*/ _jsxs("div", {
        className: cn('flex flex-col gap-6 lg:flex-row lg:items-start', fullscreen && 'fixed inset-0 z-50 bg-background p-6'),
        children: [
            !fullscreen && /*#__PURE__*/ _jsxs("div", {
                className: "w-full shrink-0 space-y-6 lg:w-72",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "space-y-1.5",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center gap-2 text-sm font-medium text-muted-foreground",
                                children: [
                                    "API URL",
                                    /*#__PURE__*/ _jsx("button", {
                                        "aria-label": "Copy API URL",
                                        type: "button",
                                        onClick: handleCopy,
                                        className: "inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                        children: copied ? /*#__PURE__*/ _jsx(Check, {
                                            className: "size-3.5"
                                        }) : /*#__PURE__*/ _jsx(Copy, {
                                            className: "size-3.5"
                                        })
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsx("a", {
                                href: fetchURL,
                                rel: "noopener noreferrer",
                                target: "_blank",
                                className: "block break-all text-sm text-primary underline-offset-2 hover:underline",
                                children: fetchURL
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "space-y-3",
                        children: [
                            draftsEnabled && /*#__PURE__*/ _jsxs("label", {
                                className: "flex items-center gap-2 text-sm",
                                children: [
                                    /*#__PURE__*/ _jsx(Checkbox, {
                                        checked: draft,
                                        onCheckedChange: ()=>setDraft(!draft)
                                    }),
                                    t('version:draft')
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("label", {
                                className: "flex items-center gap-2 text-sm",
                                children: [
                                    /*#__PURE__*/ _jsx(Checkbox, {
                                        checked: authenticated,
                                        onCheckedChange: ()=>setAuthenticated(!authenticated)
                                    }),
                                    t('authentication:authenticated')
                                ]
                            })
                        ]
                    }),
                    localeOptions && /*#__PURE__*/ _jsxs("div", {
                        className: "space-y-1.5",
                        children: [
                            /*#__PURE__*/ _jsx("label", {
                                className: "text-sm font-medium",
                                children: t('general:locale')
                            }),
                            /*#__PURE__*/ _jsxs(Select, {
                                value: locale,
                                onValueChange: setLocale,
                                children: [
                                    /*#__PURE__*/ _jsx(SelectTrigger, {
                                        className: "w-full",
                                        children: /*#__PURE__*/ _jsx(SelectValue, {})
                                    }),
                                    /*#__PURE__*/ _jsx(SelectContent, {
                                        children: localeOptions.map((option)=>/*#__PURE__*/ _jsx(SelectItem, {
                                                value: option.value,
                                                children: option.label
                                            }, option.value))
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "space-y-1.5",
                        children: [
                            /*#__PURE__*/ _jsx("label", {
                                className: "text-sm font-medium",
                                htmlFor: "api-depth",
                                children: t('general:depth')
                            }),
                            /*#__PURE__*/ _jsx(Input, {
                                id: "api-depth",
                                type: "number",
                                min: 0,
                                max: 10,
                                step: 1,
                                value: depth,
                                onChange: (e)=>setDepth(e.target.value)
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "relative min-w-0 flex-1",
                children: [
                    /*#__PURE__*/ _jsx("button", {
                        "aria-label": "toggle fullscreen",
                        type: "button",
                        onClick: ()=>setFullscreen(!fullscreen),
                        className: "absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        children: fullscreen ? /*#__PURE__*/ _jsx(Minimize2, {
                            className: "size-3.5"
                        }) : /*#__PURE__*/ _jsx(Maximize2, {
                            className: "size-3.5"
                        })
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        className: cn('overflow-auto rounded-md border border-border bg-muted/40 p-4 font-mono text-sm leading-relaxed', fullscreen ? 'h-full' : 'max-h-[calc(100vh-12rem)]'),
                        children: /*#__PURE__*/ _jsx("ul", {
                            children: /*#__PURE__*/ _jsx(RenderJson, {
                                object: data
                            })
                        })
                    })
                ]
            })
        ]
    });
}

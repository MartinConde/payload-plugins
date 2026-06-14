'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Tab strip above the Designer canvas. One tab per row in the `views` array,
   plus an "+ Add view" dropdown listing preset names from the plugin config and
   a free-text input for ad-hoc names. Active state is COMPONENT-LOCAL — no
   form writes on switch — so the canvas swap is instant and never triggers a
   form-server roundtrip. Add/Remove go through `useForm()`'s addFieldRow /
   removeFieldRow so Payload's form-state bookkeeping stays correct (row ids,
   modified flag, etc.). */ import * as React from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Input, useDocFormFieldValue, useDocFormSetValue } from 'payload-plugin-shadcn-ui';
import { useTranslation } from '@payloadcms/ui';
export function ViewTabs({ active, onActive, presets, disabled }) {
    const { t } = useTranslation();
    const tr = (k)=>t(k);
    const setValueAtPath = useDocFormSetValue();
    const viewsRaw = useDocFormFieldValue('views');
    const views = Array.isArray(viewsRaw) ? viewsRaw : [];
    const [customName, setCustomName] = React.useState('');
    const [menuOpen, setMenuOpen] = React.useState(false);
    // Clamp `active` if the row at that index disappeared. (e.g. just deleted.)
    React.useEffect(()=>{
        if (views.length === 0) return;
        if (active >= views.length) onActive(Math.max(0, views.length - 1));
    }, [
        views.length,
        active,
        onActive
    ]);
    const addView = (name)=>{
        const trimmed = name.trim();
        if (!trimmed) return;
        const newRow = {
            // Shadcn-admin's bridge fingerprints array rows by `id` (string) for its
            // structural diff (see AutoDocFormBridge's rowId helper) — give every
            // new row a stable client id immediately. The server replaces it with
            // a canonical uuid via `ensureViewId` on save.
            id: crypto.randomUUID(),
            name: trimmed,
            printAreaSource: 'template',
            printAreaPlacement: []
        };
        setValueAtPath('views', [
            ...views,
            newRow
        ]);
        setMenuOpen(false);
        setCustomName('');
        // Focus the newly-added view after the write settles.
        Promise.resolve().then(()=>onActive(views.length));
    };
    const deleteView = (rowIndex)=>{
        if (views.length <= 1) return;
        if (typeof window !== 'undefined' && !window.confirm(tr('pluginProducts:confirmDeleteView'))) {
            return;
        }
        const nextViews = views.filter((_, i)=>i !== rowIndex);
        setValueAtPath('views', nextViews);
        if (active >= rowIndex && active > 0) onActive(active - 1);
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-wrap items-center gap-1 border-b",
        children: [
            views.map((row, i)=>/*#__PURE__*/ _jsxs("div", {
                    className: 'flex items-center gap-1 rounded-t-md border border-b-0 px-2 py-1 text-sm ' + (i === active ? 'bg-background font-medium text-foreground' : 'border-transparent bg-muted/40 text-muted-foreground hover:text-foreground'),
                    children: [
                        /*#__PURE__*/ _jsx("button", {
                            type: "button",
                            className: "cursor-pointer outline-none",
                            onClick: ()=>onActive(i),
                            disabled: disabled,
                            children: row.name?.trim() || `${tr('pluginProducts:viewName')} ${i + 1}`
                        }),
                        views.length > 1 && i === active && !disabled ? /*#__PURE__*/ _jsx("button", {
                            type: "button",
                            className: "text-muted-foreground hover:text-destructive",
                            onClick: ()=>deleteView(i),
                            title: tr('pluginProducts:deleteView'),
                            "aria-label": tr('pluginProducts:deleteView'),
                            children: /*#__PURE__*/ _jsx(Trash2Icon, {
                                className: "size-3.5"
                            })
                        }) : null
                    ]
                }, row.id ?? i)),
            !disabled ? /*#__PURE__*/ _jsxs(DropdownMenu, {
                open: menuOpen,
                onOpenChange: setMenuOpen,
                children: [
                    /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsxs(Button, {
                            type: "button",
                            variant: "ghost",
                            size: "sm",
                            className: "gap-1",
                            children: [
                                /*#__PURE__*/ _jsx(PlusIcon, {
                                    className: "size-4"
                                }),
                                tr('pluginProducts:addView')
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsxs(DropdownMenuContent, {
                        align: "start",
                        className: "w-56",
                        children: [
                            presets.map((preset)=>/*#__PURE__*/ _jsx(DropdownMenuItem, {
                                    onSelect: ()=>addView(preset),
                                    children: preset
                                }, preset)),
                            /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center gap-1 px-2 py-1.5",
                                children: [
                                    /*#__PURE__*/ _jsx(Input, {
                                        value: customName,
                                        placeholder: tr('pluginProducts:viewName'),
                                        onChange: (e)=>setCustomName(e.target.value),
                                        onKeyDown: (e)=>{
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addView(customName);
                                            }
                                        },
                                        className: "h-8"
                                    }),
                                    /*#__PURE__*/ _jsx(Button, {
                                        type: "button",
                                        size: "sm",
                                        onClick: ()=>addView(customName),
                                        disabled: !customName.trim(),
                                        children: tr('pluginProducts:addView')
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }) : null
        ]
    });
}

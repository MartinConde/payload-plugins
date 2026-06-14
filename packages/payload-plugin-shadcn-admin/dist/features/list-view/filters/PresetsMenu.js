'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* Pair of controls that sit next to the "+ Add filter" pill in FilterBar:
   - "Save preset" Popover with an inline name Input + Save button.
   - "Presets" DropdownMenu listing saved presets; row click loads, × deletes.

   Presets are scoped per collection — backed by usePresets. */ import * as React from 'react';
import { BookmarkIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { PRESET_ERROR, PresetError, usePresets } from './usePresets.js';
export function PresetsMenu({ collectionSlug }) {
    const { t } = useTranslation();
    const { presets, loaded, atLimit, savePreset, loadPreset, deletePreset } = usePresets(collectionSlug);
    const [saveOpen, setSaveOpen] = React.useState(false);
    const [name, setName] = React.useState('');
    const [pendingOverwrite, setPendingOverwrite] = React.useState(false);
    const [errorCode, setErrorCode] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [loadOpen, setLoadOpen] = React.useState(false);
    const resetSaveState = React.useCallback(()=>{
        setName('');
        setPendingOverwrite(false);
        setErrorCode(null);
        setSaving(false);
    }, []);
    const handleSave = React.useCallback(async (overwrite)=>{
        setSaving(true);
        setErrorCode(null);
        try {
            await savePreset(name, {
                overwrite
            });
            setSaveOpen(false);
            resetSaveState();
        } catch (err) {
            if (err instanceof PresetError) {
                if (err.code === PRESET_ERROR.NameExists) {
                    setPendingOverwrite(true);
                } else {
                    setErrorCode(err.code);
                }
            } else {
                setErrorCode('UNKNOWN');
            }
            setSaving(false);
        }
    }, [
        name,
        savePreset,
        resetSaveState
    ]);
    const onSaveOpenChange = (next)=>{
        setSaveOpen(next);
        if (!next) resetSaveState();
    };
    const sortedPresets = React.useMemo(()=>[
            ...presets
        ].sort((a, b)=>b.createdAt - a.createdAt), [
        presets
    ]);
    const trimmedEmpty = name.trim().length === 0;
    const saveDisabled = !loaded || saving || trimmedEmpty || atLimit && !pendingOverwrite;
    return /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
            /*#__PURE__*/ _jsxs(Popover, {
                open: saveOpen,
                onOpenChange: onSaveOpenChange,
                children: [
                    /*#__PURE__*/ _jsx(PopoverTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsxs(Button, {
                            type: "button",
                            variant: "ghost",
                            size: "sm",
                            className: "h-7 gap-1 border border-border text-muted-foreground hover:text-foreground",
                            disabled: !loaded,
                            children: [
                                /*#__PURE__*/ _jsx(BookmarkIcon, {
                                    className: "size-3.5"
                                }),
                                t('shadcnAdmin:savePreset')
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsx(PopoverContent, {
                        className: "w-64 p-3",
                        align: "start",
                        children: /*#__PURE__*/ _jsxs("div", {
                            className: "flex flex-col gap-2",
                            children: [
                                /*#__PURE__*/ _jsx("label", {
                                    htmlFor: "preset-name",
                                    className: "text-xs font-medium text-muted-foreground",
                                    children: t('shadcnAdmin:presetName')
                                }),
                                /*#__PURE__*/ _jsx(Input, {
                                    id: "preset-name",
                                    autoFocus: true,
                                    value: name,
                                    placeholder: t('shadcnAdmin:presetNamePlaceholder'),
                                    onChange: (e)=>{
                                        setName(e.currentTarget.value);
                                        if (pendingOverwrite) setPendingOverwrite(false);
                                        if (errorCode) setErrorCode(null);
                                    },
                                    onKeyDown: (e)=>{
                                        if (e.key === 'Enter' && !saveDisabled) {
                                            e.preventDefault();
                                            void handleSave(pendingOverwrite);
                                        }
                                    },
                                    className: "h-8 text-sm"
                                }),
                                pendingOverwrite ? /*#__PURE__*/ _jsx("div", {
                                    className: "text-xs text-muted-foreground",
                                    children: t('shadcnAdmin:presetExists', {
                                        name: name.trim()
                                    })
                                }) : null,
                                errorCode === PRESET_ERROR.AtLimit ? /*#__PURE__*/ _jsx("div", {
                                    className: "text-xs text-muted-foreground",
                                    children: t('shadcnAdmin:presetAtLimit', {
                                        max: 20
                                    })
                                }) : null,
                                errorCode === 'UNKNOWN' ? /*#__PURE__*/ _jsx("div", {
                                    className: "text-xs text-destructive",
                                    children: t('shadcnAdmin:presetSaveFailed')
                                }) : null,
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "flex items-center justify-end gap-2 pt-1",
                                    children: [
                                        /*#__PURE__*/ _jsx(Button, {
                                            type: "button",
                                            variant: "ghost",
                                            size: "sm",
                                            className: "h-7",
                                            onClick: ()=>onSaveOpenChange(false),
                                            children: t('general:cancel')
                                        }),
                                        /*#__PURE__*/ _jsx(Button, {
                                            type: "button",
                                            size: "sm",
                                            className: "h-7",
                                            disabled: saveDisabled,
                                            onClick: ()=>void handleSave(pendingOverwrite),
                                            children: pendingOverwrite ? t('shadcnAdmin:replace') : t('general:save')
                                        })
                                    ]
                                })
                            ]
                        })
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs(DropdownMenu, {
                open: loadOpen,
                onOpenChange: setLoadOpen,
                children: [
                    /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsxs(Button, {
                            type: "button",
                            variant: "ghost",
                            size: "sm",
                            className: "h-7 gap-1 border border-border text-muted-foreground hover:text-foreground",
                            children: [
                                t('shadcnAdmin:presets'),
                                presets.length > 0 ? /*#__PURE__*/ _jsx("span", {
                                    className: "rounded-sm bg-muted px-1 text-[10px] font-medium text-muted-foreground",
                                    children: presets.length
                                }) : null,
                                /*#__PURE__*/ _jsx(ChevronDownIcon, {
                                    className: "size-3.5"
                                })
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsx(DropdownMenuContent, {
                        align: "start",
                        className: "w-56 p-1",
                        children: !loaded ? /*#__PURE__*/ _jsx("div", {
                            className: "px-2 py-1.5 text-xs text-muted-foreground",
                            children: t('general:loading')
                        }) : sortedPresets.length === 0 ? /*#__PURE__*/ _jsx("div", {
                            className: "px-2 py-1.5 text-xs text-muted-foreground",
                            children: t('shadcnAdmin:noPresetsYet')
                        }) : sortedPresets.map((preset)=>/*#__PURE__*/ _jsxs("div", {
                                role: "button",
                                tabIndex: 0,
                                onClick: ()=>{
                                    loadPreset(preset.id);
                                    setLoadOpen(false);
                                },
                                onKeyDown: (e)=>{
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        loadPreset(preset.id);
                                        setLoadOpen(false);
                                    }
                                },
                                className: "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent",
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "flex-1 truncate",
                                        children: preset.name
                                    }),
                                    /*#__PURE__*/ _jsx("button", {
                                        type: "button",
                                        "aria-label": t('shadcnAdmin:deletePresetLabel', {
                                            name: preset.name
                                        }),
                                        onClick: (e)=>{
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void deletePreset(preset.id);
                                        },
                                        className: "-mr-1 rounded-sm p-0.5 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100",
                                        children: /*#__PURE__*/ _jsx(XIcon, {
                                            className: "size-3.5"
                                        })
                                    })
                                ]
                            }, preset.id))
                    })
                ]
            })
        ]
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Combobox-style select widgets used by FieldInput's `select` case: a
   searchable single-select and a multi-select with removable badges. Split
   out of FieldInput.tsx since both are self-contained UI, independent of the
   field-type dispatch switch. */ import * as React from 'react';
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapterUI.js';
import { Badge } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'payload-plugin-shadcn-ui';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
/** Single-selects with more options than this render as a searchable combobox
 *  instead of a plain dropdown. */ export const SEARCHABLE_SELECT_THRESHOLD = 8;
/** Searchable single-select combobox (Popover + Command), for long option
 *  lists like a locale picker. Mirrors MultiSelect's chrome but holds one
 *  value and closes on pick. */ export function SearchableSelect({ id, options, value, onChange, invalid, disabled }) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const selectedLabel = options.find((o)=>o.value === value)?.label;
    return /*#__PURE__*/ _jsxs(Popover, {
        open: open,
        onOpenChange: setOpen,
        children: [
            /*#__PURE__*/ _jsx(PopoverTrigger, {
                asChild: true,
                children: /*#__PURE__*/ _jsxs(Button, {
                    id: id,
                    type: "button",
                    variant: "outline",
                    disabled: disabled,
                    "aria-invalid": invalid ? true : undefined,
                    className: cn('h-9 w-full justify-between border-input px-3 font-normal', 'aria-invalid:border-destructive aria-invalid:ring-destructive/40'),
                    children: [
                        /*#__PURE__*/ _jsx("span", {
                            className: cn('truncate', !selectedLabel && 'text-muted-foreground'),
                            children: selectedLabel ?? t('general:selectValue')
                        }),
                        /*#__PURE__*/ _jsx(ChevronsUpDownIcon, {
                            className: "size-4 shrink-0 opacity-50"
                        })
                    ]
                })
            }),
            /*#__PURE__*/ _jsx(PopoverContent, {
                className: "w-[--radix-popover-trigger-width] min-w-56 p-0",
                align: "start",
                children: /*#__PURE__*/ _jsxs(Command, {
                    children: [
                        /*#__PURE__*/ _jsx(CommandInput, {
                            placeholder: t('shadcnAdmin:searchPlaceholder')
                        }),
                        /*#__PURE__*/ _jsxs(CommandList, {
                            children: [
                                /*#__PURE__*/ _jsx(CommandEmpty, {
                                    children: t('shadcnAdmin:noOptions')
                                }),
                                /*#__PURE__*/ _jsx(CommandGroup, {
                                    children: options.map((opt)=>/*#__PURE__*/ _jsxs(CommandItem, {
                                            value: opt.label,
                                            onSelect: ()=>{
                                                onChange(opt.value);
                                                setOpen(false);
                                            },
                                            children: [
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "flex-1 truncate",
                                                    children: opt.label
                                                }),
                                                /*#__PURE__*/ _jsx(CheckIcon, {
                                                    className: cn('size-4', value === opt.value ? 'opacity-100' : 'opacity-0')
                                                })
                                            ]
                                        }, opt.value))
                                })
                            ]
                        })
                    ]
                })
            })
        ]
    });
}
export function MultiSelect({ id, options, value, onChange, invalid, disabled }) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const labelFor = React.useCallback((v)=>options.find((o)=>o.value === v)?.label ?? v, [
        options
    ]);
    const toggle = (v)=>{
        onChange(value.includes(v) ? value.filter((x)=>x !== v) : [
            ...value,
            v
        ]);
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-2",
        children: [
            value.length > 0 ? /*#__PURE__*/ _jsx("div", {
                className: "flex flex-wrap gap-1",
                children: value.map((v)=>/*#__PURE__*/ _jsxs(Badge, {
                        variant: "secondary",
                        className: "gap-1 pr-1",
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                className: "max-w-[12rem] truncate",
                                children: labelFor(v)
                            }),
                            /*#__PURE__*/ _jsx("button", {
                                type: "button",
                                onClick: ()=>toggle(v),
                                className: "hover:bg-muted-foreground/20 rounded-sm",
                                "aria-label": t('shadcnAdmin:removeField', {
                                    label: labelFor(v)
                                }),
                                children: /*#__PURE__*/ _jsx(XIcon, {
                                    className: "size-3"
                                })
                            })
                        ]
                    }, v))
            }) : null,
            /*#__PURE__*/ _jsxs(Popover, {
                open: open,
                onOpenChange: setOpen,
                children: [
                    /*#__PURE__*/ _jsx(PopoverTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsx(Button, {
                            id: id,
                            type: "button",
                            variant: "outline",
                            size: "sm",
                            disabled: disabled,
                            "aria-invalid": invalid ? true : undefined,
                            className: cn('justify-start', 'aria-invalid:border-destructive aria-invalid:ring-destructive/40'),
                            children: value.length === 0 ? t('general:selectValue') : t('shadcnAdmin:addMore')
                        })
                    }),
                    /*#__PURE__*/ _jsx(PopoverContent, {
                        className: "w-72 p-0",
                        align: "start",
                        children: /*#__PURE__*/ _jsxs(Command, {
                            children: [
                                /*#__PURE__*/ _jsx(CommandInput, {
                                    placeholder: t('shadcnAdmin:searchPlaceholder')
                                }),
                                /*#__PURE__*/ _jsxs(CommandList, {
                                    children: [
                                        /*#__PURE__*/ _jsx(CommandEmpty, {
                                            children: t('shadcnAdmin:noOptions')
                                        }),
                                        /*#__PURE__*/ _jsx(CommandGroup, {
                                            children: options.map((opt)=>{
                                                const selected = value.includes(opt.value);
                                                return /*#__PURE__*/ _jsxs(CommandItem, {
                                                    value: opt.label,
                                                    onSelect: ()=>toggle(opt.value),
                                                    children: [
                                                        /*#__PURE__*/ _jsx("span", {
                                                            className: "flex-1 truncate",
                                                            children: opt.label
                                                        }),
                                                        /*#__PURE__*/ _jsx(CheckIcon, {
                                                            className: cn('size-4', selected ? 'opacity-100' : 'opacity-0')
                                                        })
                                                    ]
                                                }, opt.value);
                                            })
                                        })
                                    ]
                                })
                            ]
                        })
                    })
                ]
            })
        ]
    });
}

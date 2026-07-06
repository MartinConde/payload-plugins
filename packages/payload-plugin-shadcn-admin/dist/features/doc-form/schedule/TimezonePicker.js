'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Searchable timezone combobox for SchedulePublishPopover's "Timezone" row.
   Split out since it's a fully self-contained Popover+Command widget with no
   dependency on the parent's schedule/upcoming-jobs state. */ import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from 'payload-plugin-shadcn-ui';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'payload-plugin-shadcn-ui';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
export function TimezonePicker({ value, onChange, options, disabled }) {
    const [open, setOpen] = React.useState(false);
    const selectedLabel = options.find((tz)=>tz.value === value)?.label ?? value;
    return /*#__PURE__*/ _jsxs(Popover, {
        open: open,
        onOpenChange: setOpen,
        children: [
            /*#__PURE__*/ _jsx(PopoverTrigger, {
                asChild: true,
                children: /*#__PURE__*/ _jsxs(Button, {
                    type: "button",
                    variant: "outline",
                    role: "combobox",
                    "aria-expanded": open,
                    className: "h-9 w-full justify-between font-normal",
                    disabled: disabled,
                    children: [
                        /*#__PURE__*/ _jsx("span", {
                            className: "truncate",
                            children: selectedLabel
                        }),
                        /*#__PURE__*/ _jsx(ChevronsUpDown, {
                            className: "size-4 shrink-0 opacity-50"
                        })
                    ]
                })
            }),
            /*#__PURE__*/ _jsx(PopoverContent, {
                className: "w-[var(--radix-popover-trigger-width)] p-0",
                align: "start",
                children: /*#__PURE__*/ _jsxs(Command, {
                    children: [
                        /*#__PURE__*/ _jsx(CommandInput, {
                            placeholder: "Search timezone…"
                        }),
                        /*#__PURE__*/ _jsxs(CommandList, {
                            children: [
                                /*#__PURE__*/ _jsx(CommandEmpty, {
                                    children: "No timezone found."
                                }),
                                /*#__PURE__*/ _jsx(CommandGroup, {
                                    children: options.map((tz)=>/*#__PURE__*/ _jsxs(CommandItem, {
                                            value: tz.label,
                                            onSelect: ()=>{
                                                onChange(tz.value);
                                                setOpen(false);
                                            },
                                            children: [
                                                /*#__PURE__*/ _jsx(Check, {
                                                    className: cn('size-4', value === tz.value ? 'opacity-100' : 'opacity-0')
                                                }),
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "truncate",
                                                    children: tz.label
                                                })
                                            ]
                                        }, tz.value))
                                })
                            ]
                        })
                    ]
                })
            })
        ]
    });
}

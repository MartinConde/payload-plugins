'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Trailing "+ Add filter" pill. Opens a Popover with a Command-driven field
   picker. Selecting a field calls onAdd with the chosen field and its
   default operator, leaving the value empty for the chip editor to fill in. */ import * as React from 'react';
import { CirclePlusIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'payload-plugin-shadcn-ui';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { defaultOperatorForField, isFilterable, isPolymorphicRelationship } from './filterCodec.js';
const labelForField = (field)=>{
    const raw = field.label;
    if (typeof raw === 'string' && raw.length > 0) return raw;
    if (!field.name) return field.type;
    return field.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ');
};
export function AddFilterMenu({ fields, onAdd }) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const filterableFields = fields.filter(isFilterable);
    const handleSelect = (name)=>{
        const field = fields.find((f)=>f.name === name);
        if (!field) return;
        if (isPolymorphicRelationship(field)) return;
        onAdd({
            field: name,
            operator: defaultOperatorForField(field),
            value: null
        });
        setOpen(false);
    };
    return /*#__PURE__*/ _jsxs(Popover, {
        open: open,
        onOpenChange: setOpen,
        children: [
            /*#__PURE__*/ _jsx(PopoverTrigger, {
                asChild: true,
                children: /*#__PURE__*/ _jsxs(Button, {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: "h-7 gap-1 border border-primary/40 text-primary hover:bg-primary/10 hover:text-primary",
                    children: [
                        /*#__PURE__*/ _jsx(CirclePlusIcon, {
                            className: "size-3.5"
                        }),
                        t('general:addFilter')
                    ]
                })
            }),
            /*#__PURE__*/ _jsx(PopoverContent, {
                className: "w-64 p-0",
                align: "start",
                children: /*#__PURE__*/ _jsxs(Command, {
                    children: [
                        /*#__PURE__*/ _jsx(CommandInput, {
                            placeholder: t('shadcnAdmin:findFieldPlaceholder')
                        }),
                        /*#__PURE__*/ _jsxs(CommandList, {
                            children: [
                                /*#__PURE__*/ _jsx(CommandEmpty, {
                                    children: t('shadcnAdmin:noFields')
                                }),
                                /*#__PURE__*/ _jsx(CommandGroup, {
                                    children: filterableFields.map((f)=>{
                                        const disabled = isPolymorphicRelationship(f);
                                        return /*#__PURE__*/ _jsxs(CommandItem, {
                                            value: f.name,
                                            disabled: disabled,
                                            onSelect: ()=>handleSelect(f.name),
                                            children: [
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "flex-1 truncate",
                                                    children: labelForField(f)
                                                }),
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "text-[10px] uppercase text-muted-foreground",
                                                    children: f.type
                                                })
                                            ]
                                        }, f.name);
                                    })
                                })
                            ]
                        })
                    ]
                })
            })
        ]
    });
}

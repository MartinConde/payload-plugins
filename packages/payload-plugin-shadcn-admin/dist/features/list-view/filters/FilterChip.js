'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* A single filter chip: [field-label] [operator] [value] [×].
   Click on the body (not the ×) opens the editor popover. */ import * as React from 'react';
import { XIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { operatorsForField, resolveOperatorLabel } from './filterCodec.js';
import { FilterChipEditor } from './FilterChipEditor.js';
const labelForField = (field)=>{
    const raw = field.label;
    if (typeof raw === 'string' && raw.length > 0) return raw;
    if (!field.name) return field.type;
    return field.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ');
};
const stringifyValue = (chip, field)=>{
    if (chip.operator === 'exists') {
        return chip.value === false ? 'no' : 'yes';
    }
    if (chip.value === null || chip.value === undefined || chip.value === '') {
        return '—';
    }
    if (Array.isArray(chip.value)) {
        if (chip.value.length === 0) return '—';
        if (chip.value.length <= 2) return chip.value.join(', ');
        return `${chip.value.length} values`;
    }
    if (typeof chip.value === 'boolean') return chip.value ? 'true' : 'false';
    // For select/radio, swap the value out for its label
    if (field && (field.type === 'select' || field.type === 'radio')) {
        const opts = field.options;
        if (Array.isArray(opts)) {
            for (const opt of opts){
                if (typeof opt === 'object' && opt !== null) {
                    const o = opt;
                    if (String(o.value) === String(chip.value) && typeof o.label === 'string') {
                        return o.label;
                    }
                }
            }
        }
    }
    const s = String(chip.value);
    return s.length > 20 ? s.slice(0, 19) + '…' : s;
};
export function FilterChip({ chip, fields, useAsTitleBySlug, isInOrGroup, isFirstNode, canMoveLeft, canMoveRight, onChange, onRemove, onMove, onToggleOrJoin, defaultOpen = false }) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(defaultOpen);
    const field = fields.find((f)=>f.name === chip.field);
    const opDesc = field ? operatorsForField(field).find((o)=>o.value === chip.operator) : undefined;
    const fieldLabel = field ? labelForField(field) : chip.field;
    const opLabel = opDesc ? resolveOperatorLabel(opDesc.label, t) : chip.operator;
    const valueLabel = stringifyValue(chip, field);
    const showValue = !opDesc?.noValue;
    // "Filled" = this chip carries a real constraint, so it should read as a live
    // filter (accent border + tint). Pending chips with no value yet stay neutral.
    const isFilled = (()=>{
        if (opDesc?.noValue || chip.operator === 'exists') return true;
        const v = chip.value;
        if (v === null || v === undefined || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
    })();
    const divider = /*#__PURE__*/ _jsx("span", {
        "aria-hidden": true,
        className: "h-3.5 w-px shrink-0 bg-border/80"
    });
    return /*#__PURE__*/ _jsxs(Popover, {
        open: open,
        onOpenChange: setOpen,
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: cn('inline-flex h-7 items-center overflow-hidden rounded-md border text-xs transition-colors', isFilled ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'),
                children: [
                    /*#__PURE__*/ _jsx(PopoverTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsxs("button", {
                            type: "button",
                            className: "flex h-full cursor-pointer items-center gap-1.5 pl-2 pr-1.5 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            children: [
                                /*#__PURE__*/ _jsx("span", {
                                    className: "font-medium text-foreground",
                                    children: fieldLabel
                                }),
                                divider,
                                /*#__PURE__*/ _jsx("span", {
                                    className: "text-muted-foreground",
                                    children: opLabel
                                }),
                                showValue && /*#__PURE__*/ _jsxs(_Fragment, {
                                    children: [
                                        divider,
                                        /*#__PURE__*/ _jsx("span", {
                                            className: cn('max-w-[10rem] truncate font-semibold', isFilled ? 'text-primary' : 'text-muted-foreground/70'),
                                            children: valueLabel
                                        })
                                    ]
                                })
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsx("span", {
                        "aria-hidden": true,
                        className: "h-full w-px shrink-0 bg-border"
                    }),
                    /*#__PURE__*/ _jsx("button", {
                        type: "button",
                        onClick: (e)=>{
                            e.stopPropagation();
                            onRemove();
                        },
                        className: "flex h-full cursor-pointer items-center px-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        "aria-label": t('shadcnAdmin:removeFilter'),
                        children: /*#__PURE__*/ _jsx(XIcon, {
                            className: "size-3"
                        })
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(PopoverContent, {
                align: "start",
                className: "w-72 p-3",
                children: /*#__PURE__*/ _jsx(FilterChipEditor, {
                    chip: chip,
                    fields: fields,
                    useAsTitleBySlug: useAsTitleBySlug,
                    isInOrGroup: isInOrGroup,
                    isFirstNode: isFirstNode,
                    canMoveLeft: canMoveLeft,
                    canMoveRight: canMoveRight,
                    onChange: onChange,
                    onRemove: ()=>{
                        setOpen(false);
                        onRemove();
                    },
                    onMove: onMove,
                    onToggleOrJoin: onToggleOrJoin
                })
            })
        ]
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Per-field-type value input rendered inside the chip editor popover.
   Operator is chosen separately; this component only renders the value
   control appropriate to (field.type, operator). */ import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Calendar } from 'payload-plugin-shadcn-ui';
import { Checkbox } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { operatorsForField } from './filterCodec.js';
import { RelationshipPicker } from '../../../shared/RelationshipPicker.js';
const stringifyValue = (value)=>{
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(',');
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
};
const formatDateLabel = (value, placeholder)=>{
    const s = typeof value === 'string' ? value : '';
    if (!s) return placeholder;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
};
const toISODate = (date)=>{
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
const fieldOptions = (field)=>{
    const opts = field.options;
    if (!Array.isArray(opts)) return [];
    return opts.map((opt)=>{
        if (typeof opt === 'string') return {
            value: opt,
            label: opt
        };
        if (opt && typeof opt === 'object') {
            const o = opt;
            const label = typeof o.label === 'string' ? o.label : String(o.value);
            return {
                value: String(o.value),
                label
            };
        }
        return {
            value: String(opt),
            label: String(opt)
        };
    });
};
export function FilterValueInput({ field, operator, value, useAsTitleBySlug, onChange }) {
    const { t } = useTranslation();
    const opDesc = operatorsForField(field).find((o)=>o.value === operator);
    if (opDesc?.noValue) return null;
    // Relationship
    if (field.type === 'relationship' && !Array.isArray(field.relationTo)) {
        const relatedSlug = field.relationTo;
        return /*#__PURE__*/ _jsx(RelationshipPicker, {
            relatedSlug: relatedSlug,
            useAsTitle: useAsTitleBySlug?.[relatedSlug],
            multi: Boolean(opDesc?.multi),
            value: Array.isArray(value) ? value : typeof value === 'string' ? value : null,
            onChange: (v)=>onChange(v)
        });
    }
    // Multi (in / not_in) for select/radio
    if (opDesc?.multi && (field.type === 'select' || field.type === 'radio')) {
        const opts = fieldOptions(field);
        const selected = Array.isArray(value) ? value.map(String) : [];
        return /*#__PURE__*/ _jsxs("div", {
            className: "flex max-h-60 flex-col gap-1 overflow-y-auto",
            children: [
                opts.length === 0 && /*#__PURE__*/ _jsx("span", {
                    className: "text-sm text-muted-foreground",
                    children: "No options"
                }),
                opts.map((opt)=>{
                    const checked = selected.includes(opt.value);
                    return /*#__PURE__*/ _jsxs("label", {
                        className: "flex items-center gap-2 text-sm cursor-pointer",
                        children: [
                            /*#__PURE__*/ _jsx(Checkbox, {
                                checked: checked,
                                onCheckedChange: (c)=>{
                                    if (c) onChange([
                                        ...selected,
                                        opt.value
                                    ]);
                                    else onChange(selected.filter((v)=>v !== opt.value));
                                }
                            }),
                            /*#__PURE__*/ _jsx("span", {
                                children: opt.label
                            })
                        ]
                    }, opt.value);
                })
            ]
        });
    }
    // Single select / radio
    if (field.type === 'select' || field.type === 'radio') {
        const opts = fieldOptions(field);
        return /*#__PURE__*/ _jsxs(Select, {
            value: typeof value === 'string' ? value : '',
            onValueChange: (v)=>onChange(v),
            children: [
                /*#__PURE__*/ _jsx(SelectTrigger, {
                    size: "sm",
                    className: "w-full",
                    children: /*#__PURE__*/ _jsx(SelectValue, {
                        placeholder: t('general:selectValue')
                    })
                }),
                /*#__PURE__*/ _jsx(SelectContent, {
                    children: opts.map((opt)=>/*#__PURE__*/ _jsx(SelectItem, {
                            value: opt.value,
                            children: opt.label
                        }, opt.value))
                })
            ]
        });
    }
    // Checkbox
    if (field.type === 'checkbox') {
        return /*#__PURE__*/ _jsxs(Select, {
            value: value === true || value === 'true' ? 'true' : 'false',
            onValueChange: (v)=>onChange(v === 'true'),
            children: [
                /*#__PURE__*/ _jsx(SelectTrigger, {
                    size: "sm",
                    className: "w-full",
                    children: /*#__PURE__*/ _jsx(SelectValue, {})
                }),
                /*#__PURE__*/ _jsxs(SelectContent, {
                    children: [
                        /*#__PURE__*/ _jsx(SelectItem, {
                            value: "true",
                            children: "checked"
                        }),
                        /*#__PURE__*/ _jsx(SelectItem, {
                            value: "false",
                            children: "unchecked"
                        })
                    ]
                })
            ]
        });
    }
    // Date
    if (field.type === 'date' || field.name === 'createdAt' || field.name === 'updatedAt') {
        const selected = typeof value === 'string' && value ? (()=>{
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? undefined : d;
        })() : undefined;
        return /*#__PURE__*/ _jsxs(Popover, {
            children: [
                /*#__PURE__*/ _jsx(PopoverTrigger, {
                    asChild: true,
                    children: /*#__PURE__*/ _jsxs(Button, {
                        type: "button",
                        variant: "outline",
                        size: "sm",
                        className: "w-full justify-start font-normal",
                        children: [
                            /*#__PURE__*/ _jsx(CalendarIcon, {
                                className: "mr-2 size-4"
                            }),
                            formatDateLabel(value, t('shadcnAdmin:pickDate'))
                        ]
                    })
                }),
                /*#__PURE__*/ _jsx(PopoverContent, {
                    className: "w-auto p-0",
                    align: "start",
                    children: /*#__PURE__*/ _jsx(Calendar, {
                        mode: "single",
                        selected: selected,
                        onSelect: (d)=>onChange(d ? toISODate(d) : null),
                        autoFocus: true
                    })
                })
            ]
        });
    }
    // Number
    if (field.type === 'number') {
        return /*#__PURE__*/ _jsx(Input, {
            type: "number",
            value: typeof value === 'string' || typeof value === 'number' ? String(value) : '',
            onChange: (e)=>onChange(e.target.value || null),
            className: "h-8"
        });
    }
    // Synthetic `id`: text or array (for `in`)
    if (field.name === 'id') {
        if (opDesc?.multi) {
            return /*#__PURE__*/ _jsx(Input, {
                placeholder: "IDs (comma-separated)",
                value: Array.isArray(value) ? value.join(',') : '',
                onChange: (e)=>{
                    const parts = e.target.value.split(',').map((s)=>s.trim()).filter(Boolean);
                    onChange(parts);
                },
                className: "h-8"
            });
        }
        return /*#__PURE__*/ _jsx(Input, {
            placeholder: "ID",
            value: typeof value === 'string' ? value : '',
            onChange: (e)=>onChange(e.target.value || null),
            className: "h-8"
        });
    }
    // Default: text / email / textarea
    return /*#__PURE__*/ _jsx(Input, {
        value: stringifyValue(value),
        onChange: (e)=>onChange(e.target.value || null),
        className: "h-8",
        autoFocus: true
    });
}

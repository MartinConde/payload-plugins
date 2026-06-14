'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Contents rendered inside the chip's popover. Surfaces:
   - Field picker (search via Command)
   - Operator dropdown (Select)
   - Value input (delegated to FilterValueInput)
   - Match (AND / OR) toggle
   - Move left / right
   - Remove
*/ import * as React from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ChevronsUpDownIcon, Trash2Icon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'payload-plugin-shadcn-ui';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { defaultOperatorForField, isFilterable, isPolymorphicRelationship, operatorsForField, resolveOperatorLabel } from './filterCodec.js';
import { FilterValueInput } from './FilterValueInput.js';
const labelForField = (field)=>{
    const raw = field.label;
    if (typeof raw === 'string' && raw.length > 0) return raw;
    if (!field.name) return field.type;
    return field.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ');
};
export function FilterChipEditor({ chip, fields, useAsTitleBySlug, isInOrGroup, isFirstNode, canMoveLeft, canMoveRight, onChange, onRemove, onMove, onToggleOrJoin }) {
    const { t } = useTranslation();
    const [fieldPickerOpen, setFieldPickerOpen] = React.useState(false);
    const field = fields.find((f)=>f.name === chip.field);
    const fieldLabel = field ? labelForField(field) : chip.field;
    const operators = field ? operatorsForField(field) : [];
    const opDesc = operators.find((o)=>o.value === chip.operator);
    const showValue = Boolean(field) && !opDesc?.noValue;
    const sectionLabel = 'text-[10px] font-medium uppercase tracking-wide text-muted-foreground';
    const filterableFields = fields.filter(isFilterable);
    const handleFieldChange = (nextFieldName)=>{
        const nextField = fields.find((f)=>f.name === nextFieldName);
        if (!nextField) return;
        onChange({
            field: nextFieldName,
            operator: defaultOperatorForField(nextField),
            value: null
        });
        setFieldPickerOpen(false);
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-3",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-col gap-1.5",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        className: sectionLabel,
                        children: t('shadcnAdmin:filterField')
                    }),
                    /*#__PURE__*/ _jsxs(Popover, {
                        open: fieldPickerOpen,
                        onOpenChange: setFieldPickerOpen,
                        children: [
                            /*#__PURE__*/ _jsx(PopoverTrigger, {
                                asChild: true,
                                children: /*#__PURE__*/ _jsxs(Button, {
                                    type: "button",
                                    variant: "outline",
                                    size: "sm",
                                    className: "w-full justify-between",
                                    children: [
                                        /*#__PURE__*/ _jsx("span", {
                                            className: "truncate",
                                            children: fieldLabel
                                        }),
                                        /*#__PURE__*/ _jsx(ChevronsUpDownIcon, {
                                            className: "ml-2 size-3.5 opacity-50"
                                        })
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
                                                            onSelect: ()=>handleFieldChange(f.name),
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
                    })
                ]
            }),
            field && operators.length > 0 && /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-col gap-1.5",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        className: sectionLabel,
                        children: t('shadcnAdmin:filterCondition')
                    }),
                    /*#__PURE__*/ _jsxs(Select, {
                        value: chip.operator,
                        onValueChange: (v)=>{
                            const next = v;
                            // When switching to an array-valued or noValue operator, reset value
                            const nextDesc = operators.find((o)=>o.value === next);
                            if (nextDesc?.noValue) {
                                onChange({
                                    operator: next,
                                    value: true
                                });
                            } else if (nextDesc?.multi) {
                                onChange({
                                    operator: next,
                                    value: Array.isArray(chip.value) ? chip.value : []
                                });
                            } else {
                                onChange({
                                    operator: next,
                                    value: Array.isArray(chip.value) ? null : chip.value
                                });
                            }
                        },
                        children: [
                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                size: "sm",
                                className: "w-full",
                                children: /*#__PURE__*/ _jsx(SelectValue, {})
                            }),
                            /*#__PURE__*/ _jsx(SelectContent, {
                                children: operators.map((op)=>/*#__PURE__*/ _jsx(SelectItem, {
                                        value: op.value,
                                        children: resolveOperatorLabel(op.label, t)
                                    }, op.value))
                            })
                        ]
                    })
                ]
            }),
            showValue && field && /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-col gap-1.5",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        className: sectionLabel,
                        children: t('shadcnAdmin:filterValue')
                    }),
                    /*#__PURE__*/ _jsx(FilterValueInput, {
                        field: field,
                        operator: chip.operator,
                        value: chip.value,
                        useAsTitleBySlug: useAsTitleBySlug,
                        onChange: (v)=>onChange({
                                value: v
                            })
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-col gap-2 border-t pt-3",
                children: [
                    !isFirstNode && /*#__PURE__*/ _jsxs("label", {
                        className: "flex items-center justify-between text-xs",
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                className: "text-muted-foreground",
                                children: isInOrGroup ? t('shadcnAdmin:matchOrWithPrevious') : t('shadcnAdmin:matchAndWithPrevious')
                            }),
                            /*#__PURE__*/ _jsx(Button, {
                                type: "button",
                                variant: "outline",
                                size: "xs",
                                onClick: onToggleOrJoin,
                                children: isInOrGroup ? t('shadcnAdmin:switchToAnd') : t('shadcnAdmin:switchToOr')
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex gap-1",
                                children: [
                                    /*#__PURE__*/ _jsx(Button, {
                                        type: "button",
                                        variant: "ghost",
                                        size: "icon-sm",
                                        disabled: !canMoveLeft,
                                        onClick: ()=>onMove(-1),
                                        "aria-label": "Move left",
                                        children: /*#__PURE__*/ _jsx(ArrowLeftIcon, {
                                            className: "size-3.5"
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx(Button, {
                                        type: "button",
                                        variant: "ghost",
                                        size: "icon-sm",
                                        disabled: !canMoveRight,
                                        onClick: ()=>onMove(1),
                                        "aria-label": "Move right",
                                        children: /*#__PURE__*/ _jsx(ArrowRightIcon, {
                                            className: "size-3.5"
                                        })
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs(Button, {
                                type: "button",
                                variant: "ghost",
                                size: "sm",
                                onClick: onRemove,
                                className: "text-destructive hover:text-destructive",
                                children: [
                                    /*#__PURE__*/ _jsx(Trash2Icon, {
                                        className: "mr-1 size-3.5"
                                    }),
                                    t('general:remove')
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from 'payload-plugin-shadcn-ui';
export function DataTableViewOptions({ table, onReset }) {
    const { t } = useTranslation();
    return /*#__PURE__*/ _jsxs(DropdownMenu, {
        children: [
            /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                asChild: true,
                children: /*#__PURE__*/ _jsxs(Button, {
                    variant: "outline",
                    size: "sm",
                    className: "ml-auto hidden h-8 lg:flex",
                    children: [
                        /*#__PURE__*/ _jsx(SlidersHorizontal, {
                            className: "mr-2 h-4 w-4"
                        }),
                        t('shadcnAdmin:view')
                    ]
                })
            }),
            /*#__PURE__*/ _jsxs(DropdownMenuContent, {
                align: "end",
                className: "w-[180px]",
                children: [
                    /*#__PURE__*/ _jsx(DropdownMenuLabel, {
                        children: t('shadcnAdmin:toggleColumns')
                    }),
                    /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                    table.getAllColumns().filter((column)=>typeof column.accessorFn !== 'undefined' && column.getCanHide()).map((column)=>/*#__PURE__*/ _jsx(DropdownMenuCheckboxItem, {
                            className: "capitalize",
                            checked: column.getIsVisible(),
                            onCheckedChange: (value)=>column.toggleVisibility(!!value),
                            children: column.id
                        }, column.id)),
                    onReset && /*#__PURE__*/ _jsxs(_Fragment, {
                        children: [
                            /*#__PURE__*/ _jsx(DropdownMenuSeparator, {}),
                            /*#__PURE__*/ _jsx(DropdownMenuItem, {
                                onClick: onReset,
                                children: t('shadcnAdmin:resetColumns')
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

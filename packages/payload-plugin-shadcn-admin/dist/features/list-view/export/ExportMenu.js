'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* "Export ▾" dropdown rendered in the DataTable toolbar next to View
   options. Three scopes: selected (disabled when no rows are selected),
   filtered (current URL state), all. Each item opens a field-picker
   sheet that drives the paginated CSV download. */ import * as React from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from 'payload-plugin-shadcn-ui';
import { FieldPickerSheet } from './FieldPickerSheet.js';
const LOCKED_COLUMN_IDS = new Set([
    'select'
]);
const labelFor = (field)=>{
    const label = typeof field.label === 'string' ? field.label : undefined;
    return label && label.length > 0 ? label : field.name ?? '';
};
export function ExportMenu({ table, collectionSlug, fields }) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const [scope, setScope] = React.useState('filtered');
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedRowIds = React.useMemo(()=>selectedRows.map((r)=>r.original.id), [
        selectedRows
    ]);
    /* Candidate fields, in the user's current column order (drag-reorder
     preserved). Labels and field metadata come from `fields` when
     present so polymorphic / complex serialization downstream can
     consult the original field config. Falls back to the column id
     for synthetic columns that have no Payload field entry. */ const candidates = React.useMemo(()=>{
        const fieldByName = new Map();
        if (fields) {
            for (const f of fields){
                if (!f.name) continue;
                fieldByName.set(f.name, f);
            }
        }
        return table.getAllLeafColumns().filter((col)=>!LOCKED_COLUMN_IDS.has(col.id)).map((col)=>{
            const field = fieldByName.get(col.id);
            return {
                id: col.id,
                label: field ? labelFor(field) : col.id,
                field
            };
        });
    }, [
        fields,
        table
    ]);
    /* Default-checked = columns currently visible in the table, honoring
     the user's column order. */ const initialSelectedIds = React.useMemo(()=>{
        const candidateIds = new Set(candidates.map((c)=>c.id));
        return table.getVisibleLeafColumns().map((col)=>col.id).filter((id)=>!LOCKED_COLUMN_IDS.has(id) && candidateIds.has(id));
    }, [
        candidates,
        table
    ]);
    const openWithScope = (next)=>{
        setScope(next);
        setOpen(true);
    };
    return /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
            /*#__PURE__*/ _jsxs(DropdownMenu, {
                children: [
                    /*#__PURE__*/ _jsx(DropdownMenuTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsxs(Button, {
                            variant: "outline",
                            size: "sm",
                            className: "h-8",
                            children: [
                                /*#__PURE__*/ _jsx(Download, {
                                    className: "mr-2 h-4 w-4"
                                }),
                                t('general:export')
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsxs(DropdownMenuContent, {
                        align: "end",
                        children: [
                            /*#__PURE__*/ _jsxs(DropdownMenuItem, {
                                disabled: selectedRowIds.length === 0,
                                onSelect: ()=>openWithScope('selected'),
                                children: [
                                    t('shadcnAdmin:exportSelected'),
                                    selectedRowIds.length > 0 ? ` (${selectedRowIds.length})` : ''
                                ]
                            }),
                            /*#__PURE__*/ _jsx(DropdownMenuItem, {
                                onSelect: ()=>openWithScope('filtered'),
                                children: t('shadcnAdmin:exportFiltered')
                            }),
                            /*#__PURE__*/ _jsx(DropdownMenuItem, {
                                onSelect: ()=>openWithScope('all'),
                                children: t('shadcnAdmin:exportAll')
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(FieldPickerSheet, {
                open: open,
                onOpenChange: setOpen,
                scope: scope,
                collectionSlug: collectionSlug,
                candidates: candidates,
                initialSelectedIds: initialSelectedIds,
                selectedRowIds: selectedRowIds
            })
        ]
    });
}

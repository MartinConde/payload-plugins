'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { DataTableColumnHeader } from '../data-table/DataTableColumnHeader.js';
import { findFieldByName, pickFieldNames } from './fieldPicker.js';
import { labelFor } from './cellFormatters.js';
import { renderCellForField } from './renderCellForField.js';
const PLUGIN_NAMESPACE = 'plugin-shadcn-admin';
const SORTABLE_TYPES = new Set([
    'text',
    'textarea',
    'email',
    'number',
    'date',
    'checkbox',
    'radio',
    'select'
]);
const isSortable = (field)=>{
    if (field.hasMany) return false;
    return SORTABLE_TYPES.has(field.type);
};
/* Synthetic "fields" for id / createdAt / updatedAt — Payload doesn't list
   these in collection.fields but they're always present on the row. */ const SYNTHETIC_FIELDS = {
    id: {
        type: 'text',
        name: 'id',
        label: 'ID'
    },
    createdAt: {
        type: 'date',
        name: 'createdAt',
        label: 'Created'
    },
    updatedAt: {
        type: 'date',
        name: 'updatedAt',
        label: 'Updated'
    }
};
const isExcluded = (field)=>Boolean(field.hidden || field.admin?.hidden || field.admin?.disableListColumn);
const findField = (collection, name)=>{
    if (SYNTHETIC_FIELDS[name]) return SYNTHETIC_FIELDS[name];
    return findFieldByName(collection.fields, name);
};
export function buildColumnsForCollection({ collection, useAsTitleBySlug, nativeCellFieldNames, nativeCellsByRow }) {
    const useAsTitle = collection.admin?.useAsTitle;
    const names = pickFieldNames(collection);
    const columns = [];
    for (const name of names){
        const field = findField(collection, name);
        if (!field) continue;
        if (isExcluded(field)) continue;
        const title = labelFor(field, name);
        const sortable = isSortable(field);
        // Cell resolution order (v3.20): (1) plugin escape hatch
        // `field.custom['plugin-shadcn-admin'].cell` — a client-ref function, takes
        // priority and is the recommended path for context-dependent Cells; (2) a
        // Payload-native `field.admin.components.Cell`, pre-rendered server-side and
        // looked up per row from `nativeCellsByRow`; (3) the built-in renderer.
        const override = field.custom?.[PLUGIN_NAMESPACE]?.cell;
        const hasNativeCell = Boolean(!override && nativeCellFieldNames?.includes(name));
        const fallbackCell = (ctx)=>renderCellForField(field, ctx.getValue(), {
                isUseAsTitle: name === useAsTitle,
                useAsTitleBySlug
            });
        const cell = override ?? (hasNativeCell ? (ctx)=>{
            const rowId = ctx.row.original?.id;
            const node = nativeCellsByRow?.[String(rowId)]?.[name];
            // Fall back if a row has no pre-rendered node (e.g. id missing).
            return node !== undefined ? node : fallbackCell(ctx);
        } : fallbackCell);
        columns.push({
            accessorKey: name,
            header: sortable ? ({ column })=>/*#__PURE__*/ _jsx(DataTableColumnHeader, {
                    column: column,
                    title: title
                }) : ()=>/*#__PURE__*/ _jsx("span", {
                    className: "text-xs font-medium",
                    children: title
                }),
            cell,
            enableSorting: sortable
        });
    }
    return columns;
}

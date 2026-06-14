'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { Checkbox } from 'payload-plugin-shadcn-ui';
/* Prepend to a columns[] array to opt into row selection. Pair with
   <DataTable enableRowSelection /> and a bulkActions slot. */ export function selectColumn() {
    return {
        id: 'select',
        enableSorting: false,
        enableHiding: false,
        size: 40,
        header: ({ table })=>/*#__PURE__*/ _jsx(Checkbox, {
                checked: table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false,
                onCheckedChange: (value)=>table.toggleAllPageRowsSelected(!!value),
                "aria-label": "Select all rows on this page"
            }),
        cell: ({ row })=>/*#__PURE__*/ _jsx(Checkbox, {
                checked: row.getIsSelected(),
                onCheckedChange: (value)=>row.toggleSelected(!!value),
                "aria-label": "Select row",
                onClick: (event)=>event.stopPropagation()
            })
    };
}

'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* v3.22 — grouped list rendering. One barebones TanStack table per group (core
   row model only — no per-group toolbar / pagination / selection; those would
   cost a full DataTable per group). Reuses the exact auto column defs from
   `buildColumnsForCollection`, including v3.20 native cells (looked up by rowId,
   which is unique across groups). Row click navigates to the doc, same as the
   flat list. The "Group by" picker lives in the list header (GroupByMenu). */ import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useListDrawerContext } from '../../../internal/payloadAdapterUI.js';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'payload-plugin-shadcn-ui';
import { buildColumnsForCollection } from '../columns/autoColumns.js';
import { GroupedListToolbar } from './GroupedListToolbar.js';
export function GroupedListView({ collectionSlug, collection, useAsTitleBySlug, nativeCellFieldNames, nativeCellsByRow, groups, groupByLabel, totalGroups, capped, newDocumentURL, enableCreate, enableSearch, initialSearch }) {
    const router = useRouter();
    // In Payload's "select existing" drawer the grouped list must select rows
    // (fire onSelect) rather than navigate. Outside a drawer onSelect is
    // undefined (context defaults to `{}`).
    const { onSelect: drawerOnSelect } = useListDrawerContext();
    const columns = React.useMemo(()=>buildColumnsForCollection({
            collection: collection,
            useAsTitleBySlug,
            nativeCellFieldNames,
            nativeCellsByRow
        }), [
        collection,
        useAsTitleBySlug,
        nativeCellFieldNames,
        nativeCellsByRow
    ]);
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-6",
        children: [
            /*#__PURE__*/ _jsx(GroupedListToolbar, {
                newDocumentURL: newDocumentURL,
                enableCreate: enableCreate,
                enableSearch: enableSearch,
                initialSearch: initialSearch
            }),
            groups.length === 0 ? /*#__PURE__*/ _jsx("p", {
                className: "py-8 text-center text-sm text-muted-foreground",
                children: "No results."
            }) : /*#__PURE__*/ _jsxs(_Fragment, {
                children: [
                    capped ? /*#__PURE__*/ _jsxs("p", {
                        className: "text-xs text-muted-foreground",
                        children: [
                            "Showing ",
                            groups.length,
                            " of ",
                            totalGroups,
                            " ",
                            groupByLabel,
                            " group",
                            totalGroups === 1 ? '' : 's',
                            " from a capped sample — narrow the list with a filter to see everything."
                        ]
                    }) : null,
                    groups.map((group)=>/*#__PURE__*/ _jsx(GroupSection, {
                            group: group,
                            columns: columns,
                            onRowClick: (doc)=>{
                                if (drawerOnSelect) {
                                    drawerOnSelect({
                                        collectionSlug,
                                        doc,
                                        docID: String(doc.id)
                                    });
                                    return;
                                }
                                router.push(`/admin/collections/${collectionSlug}/${doc.id}`);
                            },
                            // No real URL to link to when selecting inside a drawer.
                            getRowHref: drawerOnSelect ? undefined : (doc)=>`/admin/collections/${collectionSlug}/${doc.id}`
                        }, group.key))
                ]
            })
        ]
    });
}
function GroupSection({ group, columns, onRowClick, getRowHref }) {
    const table = useReactTable({
        data: group.rows,
        columns,
        getCoreRowModel: getCoreRowModel()
    });
    return /*#__PURE__*/ _jsxs("section", {
        className: "flex flex-col gap-2",
        children: [
            /*#__PURE__*/ _jsxs("h3", {
                className: "flex items-baseline gap-2 text-sm font-semibold",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        children: group.heading
                    }),
                    /*#__PURE__*/ _jsxs("span", {
                        className: "text-xs font-normal text-muted-foreground",
                        children: [
                            group.count,
                            " ",
                            group.count === 1 ? 'item' : 'items'
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "rounded-md border",
                children: /*#__PURE__*/ _jsxs(Table, {
                    children: [
                        /*#__PURE__*/ _jsx(TableHeader, {
                            children: table.getHeaderGroups().map((hg)=>/*#__PURE__*/ _jsx(TableRow, {
                                    children: hg.headers.map((header)=>/*#__PURE__*/ _jsx(TableHead, {
                                            children: header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())
                                        }, header.id))
                                }, hg.id))
                        }),
                        /*#__PURE__*/ _jsx(TableBody, {
                            children: table.getRowModel().rows.map((row)=>{
                                const rowHref = getRowHref?.(row.original);
                                return /*#__PURE__*/ _jsx(TableRow, {
                                    className: "cursor-pointer",
                                    onClick: ()=>onRowClick(row.original),
                                    children: row.getVisibleCells().map((cell, cellIndex)=>{
                                        const content = flexRender(cell.column.columnDef.cell, cell.getContext());
                                        return /*#__PURE__*/ _jsx(TableCell, {
                                            children: rowHref && cellIndex === 0 ? /*#__PURE__*/ _jsx("div", {
                                                onClick: (e)=>e.stopPropagation(),
                                                children: /*#__PURE__*/ _jsx(Link, {
                                                    href: rowHref,
                                                    className: "contents",
                                                    children: content
                                                })
                                            }) : content
                                        }, cell.id);
                                    })
                                }, row.id);
                            })
                        })
                    ]
                })
            })
        ]
    });
}

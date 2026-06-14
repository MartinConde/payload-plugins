'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation, useListDrawerContext } from '../../internal/payloadAdapter.js';
import { DataTable } from './data-table/DataTable.js';
import { ExportMenu } from './export/ExportMenu.js';
import { useDataTableUrlState } from './prefs/useDataTableUrlState.js';
import { useColumnPrefs } from './prefs/useColumnPrefs.js';
import { resolveColumnOrder } from './columns/resolveColumnOrder.js';
import { Button, buttonVariants } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
const LOCKED_COLUMN_IDS = [
    'select'
];
const LOCKED_COLUMN_SET = new Set(LOCKED_COLUMN_IDS);
export function CollectionListViewClient({ collectionSlug, columns, data, pageCount, rowCount, defaultPageSize, newDocumentURL, enableSearch, searchPlaceholder, enableBulkDelete, enableCreate, isTrash, trashEnabled, emptyMessage, enableExport = true, exportFields, enableSorting = true, enableFiltering = true, enableColumnVisibility = true, filterColumnId, filterPlaceholder, toolbarRight, filterBar, bulkActions, onRowClick, disableRowClick }) {
    const router = useRouter();
    const { t } = useTranslation();
    // When this list view is rendered inside Payload's "select existing" drawer
    // (relationship / upload fields, the richText Upload feature, etc.), the
    // drawer provides an `onSelect` callback. In that context a row click must
    // SELECT the doc (firing onSelect, which inserts it and closes the drawer)
    // instead of navigating to the doc edit page. Outside a drawer the context
    // defaults to `{}`, so `onSelect`/`isInDrawer` are undefined and we fall back
    // to navigation. Create-new likewise opens the drawer's nested document
    // drawer (via DocumentDrawerToggler) rather than navigating to /create.
    const { onSelect: drawerOnSelect, isInDrawer, allowCreate: drawerAllowCreate, DocumentDrawerToggler } = useListDrawerContext();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const urlState = useDataTableUrlState({
        defaultPageSize
    });
    const columnPrefs = useColumnPrefs(collectionSlug);
    const autoColumnIds = React.useMemo(()=>columns.map((c)=>{
            const id = c.id;
            if (id) return id;
            const accessor = c.accessorKey;
            return typeof accessor === 'string' ? accessor : undefined;
        }).filter((id)=>Boolean(id)), [
        columns
    ]);
    const effectiveColumnOrder = React.useMemo(()=>resolveColumnOrder(autoColumnIds, columnPrefs.order, LOCKED_COLUMN_SET), [
        autoColumnIds,
        columnPrefs.order
    ]);
    const handleColumnOrderChange = React.useCallback((updater)=>{
        const nextFull = typeof updater === 'function' ? updater(effectiveColumnOrder) : updater;
        // Persist only the user-orderable portion; locked ids never appear in
        // the stored `order`.
        const orderable = nextFull.filter((id)=>!LOCKED_COLUMN_SET.has(id));
        columnPrefs.setOrder(orderable);
    }, [
        columnPrefs,
        effectiveColumnOrder
    ]);
    const handleColumnVisibilityChange = React.useCallback((updater)=>{
        const next = typeof updater === 'function' ? updater(columnPrefs.visibility) : updater;
        columnPrefs.setVisibility(next);
    }, [
        columnPrefs
    ]);
    // Inside the select drawer, "Create New" opens the drawer's already-mounted
    // nested DocumentDrawer (whose onSave fires the drawer's onSelect to insert
    // the new doc) instead of navigating away. The drawer owns whether create is
    // allowed via `allowCreate`.
    const createButton = (()=>{
        if (isInDrawer) {
            if (!enableCreate || drawerAllowCreate === false || !DocumentDrawerToggler) return null;
            return /*#__PURE__*/ _jsxs(DocumentDrawerToggler, {
                className: cn(buttonVariants({
                    size: 'sm'
                })),
                children: [
                    /*#__PURE__*/ _jsx(Plus, {
                        className: "mr-2 h-4 w-4"
                    }),
                    t('general:createNew')
                ]
            });
        }
        return enableCreate ? /*#__PURE__*/ _jsx(Button, {
            asChild: true,
            size: "sm",
            children: /*#__PURE__*/ _jsxs(Link, {
                href: newDocumentURL,
                children: [
                    /*#__PURE__*/ _jsx(Plus, {
                        className: "mr-2 h-4 w-4"
                    }),
                    t('general:createNew')
                ]
            })
        }) : null;
    })();
    // Entry point to the trash bin, mirroring Payload's default list toolbar.
    const trashButton = trashEnabled && !isTrash ? /*#__PURE__*/ _jsx(Button, {
        asChild: true,
        size: "sm",
        variant: "outline",
        children: /*#__PURE__*/ _jsxs(Link, {
            href: `/admin/collections/${collectionSlug}/trash`,
            children: [
                /*#__PURE__*/ _jsx(Trash2, {
                    className: "mr-2 h-4 w-4"
                }),
                t('general:trash')
            ]
        })
    }) : null;
    const resolvedToolbarRight = toolbarRight ?? (createButton || trashButton ? /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-2",
        children: [
            createButton,
            trashButton
        ]
    }) : undefined);
    const resolvedBulkActions = bulkActions ?? (enableBulkDelete ? (table)=>{
        const selectedIds = table.getSelectedRowModel().rows.map((row)=>row.original.id);
        const handleDelete = async ()=>{
            const count = selectedIds.length;
            const message = trashEnabled ? t('shadcnAdmin:moveToTrashCount', {
                count
            }) : t('shadcnAdmin:deleteCount', {
                count
            });
            if (!window.confirm(message)) {
                return;
            }
            setIsDeleting(true);
            try {
                const params = new URLSearchParams();
                selectedIds.forEach((id)=>params.append('where[id][in][]', String(id)));
                // Trash-enabled collections soft-delete via PATCH { deletedAt }
                // so the doc lands in the trash; otherwise hard-delete.
                const res = trashEnabled ? await fetch(`/api/${collectionSlug}?${params.toString()}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        deletedAt: new Date().toISOString()
                    })
                }) : await fetch(`/api/${collectionSlug}?${params.toString()}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (!res.ok) {
                    throw new Error(`Delete failed (${res.status})`);
                }
                table.resetRowSelection();
                router.refresh();
            } catch (err) {
                window.alert(err instanceof Error ? err.message : t('shadcnAdmin:deleteFailed'));
            } finally{
                setIsDeleting(false);
            }
        };
        return /*#__PURE__*/ _jsxs(Button, {
            size: "sm",
            variant: "destructive",
            onClick: handleDelete,
            disabled: isDeleting,
            children: [
                /*#__PURE__*/ _jsx(Trash2, {
                    className: "mr-2 h-4 w-4"
                }),
                t('shadcnAdmin:deleteSelected')
            ]
        });
    } : undefined);
    const resolvedOnRowClick = disableRowClick ? undefined : onRowClick ?? (drawerOnSelect ? (row)=>{
        drawerOnSelect({
            collectionSlug,
            doc: row.original,
            docID: String(row.original.id)
        });
    } : (row)=>{
        // Trash rows open Payload's read-only trash doc view.
        const path = isTrash ? `/admin/collections/${collectionSlug}/trash/${row.original.id}` : `/admin/collections/${collectionSlug}/${row.original.id}`;
        router.push(path);
    });
    return /*#__PURE__*/ _jsx(DataTable, {
        columns: columns,
        data: data,
        pageCount: pageCount,
        rowCount: rowCount,
        pagination: urlState.pagination,
        onPaginationChange: urlState.onPaginationChange,
        sorting: urlState.sorting,
        onSortingChange: urlState.onSortingChange,
        columnFilters: urlState.columnFilters,
        onColumnFiltersChange: urlState.onColumnFiltersChange,
        columnOrder: effectiveColumnOrder,
        onColumnOrderChange: handleColumnOrderChange,
        columnVisibility: columnPrefs.visibility,
        onColumnVisibilityChange: handleColumnVisibilityChange,
        lockedColumnIds: LOCKED_COLUMN_IDS,
        onResetColumns: columnPrefs.reset,
        enableSorting: enableSorting,
        enableFiltering: enableFiltering,
        enableColumnVisibility: enableColumnVisibility,
        enableColumnReorder: enableColumnVisibility,
        enableRowSelection: Boolean(enableBulkDelete || bulkActions),
        searchValue: enableSearch ? urlState.search : undefined,
        onSearchChange: enableSearch ? urlState.onSearchChange : undefined,
        searchPlaceholder: searchPlaceholder,
        filterColumnId: filterColumnId,
        filterPlaceholder: filterPlaceholder,
        toolbarRight: resolvedToolbarRight,
        filterBar: filterBar,
        bulkActions: resolvedBulkActions,
        exportMenu: enableExport ? (table)=>/*#__PURE__*/ _jsx(ExportMenu, {
                table: table,
                collectionSlug: collectionSlug,
                fields: exportFields
            }) : undefined,
        onRowClick: resolvedOnRowClick,
        ...emptyMessage ? {
            emptyMessage
        } : {}
    });
}

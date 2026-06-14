'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { CollectionListViewClient } from './CollectionListViewClient.js';
import { selectColumn } from './data-table/selectColumn.js';
import { FilterBar } from './filters/FilterBar.js';
import { BulkEditSheet } from './bulk/BulkEditSheet.js';
import { TrashBulkActions } from './bulk/TrashBulkActions.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { buildColumnsForCollection } from './columns/autoColumns.js';
export function AutoColumnsBridge({ collection, useAsTitleBySlug, hasTrashPermission, nativeCellFieldNames, nativeCellsByRow, ...clientProps }) {
    const isTrash = Boolean(clientProps.isTrash);
    // In trash mode, selection (and thus bulk actions) should show when EITHER
    // restore or permanent-delete is permitted — not just delete.
    const showSelect = isTrash ? Boolean(clientProps.enableBulkDelete) || Boolean(hasTrashPermission) : Boolean(clientProps.enableBulkDelete);
    const columns = React.useMemo(()=>{
        const auto = buildColumnsForCollection({
            collection,
            useAsTitleBySlug,
            nativeCellFieldNames,
            nativeCellsByRow
        });
        return showSelect ? [
            selectColumn(),
            ...auto
        ] : auto;
    }, [
        collection,
        useAsTitleBySlug,
        showSelect,
        nativeCellFieldNames,
        nativeCellsByRow
    ]);
    // Inject the default bulk-action pair only when the consumer hasn't supplied
    // their own bulkActions. Consumer wins. In trash mode the pair becomes
    // restore + permanent-delete.
    const bulkActions = clientProps.bulkActions;
    const collectionSlug = clientProps.collectionSlug;
    const resolvedBulkActions = bulkActions ?? (showSelect ? isTrash ? (table)=>/*#__PURE__*/ _jsx(TrashBulkActions, {
            table: table,
            collectionSlug: collectionSlug,
            collection: collection,
            canRestore: hasTrashPermission,
            canDelete: Boolean(clientProps.enableBulkDelete)
        }) : (table)=>/*#__PURE__*/ _jsx(DefaultBulkActions, {
            table: table,
            collectionSlug: collectionSlug,
            collection: collection,
            useAsTitleBySlug: useAsTitleBySlug,
            trashEnabled: Boolean(clientProps.trashEnabled)
        }) : undefined);
    return /*#__PURE__*/ _jsx(CollectionListViewClient, {
        ...clientProps,
        columns: columns,
        bulkActions: resolvedBulkActions,
        exportFields: collection.fields,
        filterBar: /*#__PURE__*/ _jsx(FilterBar, {
            collection: collection,
            useAsTitleBySlug: useAsTitleBySlug
        })
    });
}
function DefaultBulkActions({ table, collectionSlug, collection, useAsTitleBySlug, trashEnabled }) {
    const router = useRouter();
    const [editOpen, setEditOpen] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const selectedIds = table.getSelectedRowModel().rows.map((row)=>row.original.id);
    const handleDelete = async ()=>{
        const count = selectedIds.length;
        const message = trashEnabled ? `Move ${count} item${count === 1 ? '' : 's'} to trash?` : `Delete ${count} item${count === 1 ? '' : 's'}? This cannot be undone.`;
        if (!window.confirm(message)) {
            return;
        }
        setDeleting(true);
        try {
            const params = new URLSearchParams();
            selectedIds.forEach((id)=>params.append('where[id][in][]', String(id)));
            // Trash-enabled collections soft-delete via PATCH { deletedAt } so the
            // doc lands in the trash bin; otherwise hard-delete via DELETE.
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
            window.alert(err instanceof Error ? err.message : 'Delete failed');
        } finally{
            setDeleting(false);
        }
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-2",
        children: [
            /*#__PURE__*/ _jsxs(Button, {
                size: "sm",
                variant: "outline",
                onClick: ()=>setEditOpen(true),
                disabled: deleting,
                children: [
                    /*#__PURE__*/ _jsx(Pencil, {
                        className: "mr-2 h-4 w-4"
                    }),
                    "Edit selected"
                ]
            }),
            /*#__PURE__*/ _jsxs(Button, {
                size: "sm",
                variant: "destructive",
                onClick: handleDelete,
                disabled: deleting,
                children: [
                    /*#__PURE__*/ _jsx(Trash2, {
                        className: "mr-2 h-4 w-4"
                    }),
                    "Delete selected"
                ]
            }),
            /*#__PURE__*/ _jsx(BulkEditSheet, {
                collectionSlug: collectionSlug,
                collection: collection,
                selectedIds: selectedIds,
                useAsTitleBySlug: useAsTitleBySlug,
                open: editOpen,
                onOpenChange: setEditOpen,
                onSuccess: ()=>{
                    setEditOpen(false);
                    table.resetRowSelection();
                    router.refresh();
                }
            })
        ]
    });
}

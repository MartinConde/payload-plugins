'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArchiveRestore, Trash2 } from 'lucide-react';
import { toast, useLocale, useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Checkbox } from 'payload-plugin-shadcn-ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'payload-plugin-shadcn-ui';
import { stringifyLabel } from 'payload-plugin-shadcn-ui';
/* Trash-mode replacement for the list's default bulk actions. Restore and
   Permanent delete on the current selection, matching Payload's RestoreMany /
   DeleteMany request shapes:
     - restore:  PATCH /api/{slug}?where[id][in][]=…&trash=true  body { deletedAt: null, _status? }
     - delete:   DELETE /api/{slug}?where[id][in][]=…&trash=true
   `_status` is only sent for drafts-enabled collections (restore-as-published
   toggle). */ export function TrashBulkActions({ table, collectionSlug, collection, canRestore = true, canDelete = true }) {
    const router = useRouter();
    const { t } = useTranslation();
    const locale = useLocale();
    const localeCode = locale && typeof locale === 'object' && 'code' in locale ? locale.code : undefined;
    const [busy, setBusy] = React.useState(false);
    const [restoreOpen, setRestoreOpen] = React.useState(false);
    const [restoreAsPublished, setRestoreAsPublished] = React.useState(false);
    const selectedIds = table.getSelectedRowModel().rows.map((row)=>row.original.id);
    const count = selectedIds.length;
    const draftsEnabled = Boolean(collection.versions?.drafts);
    const label = (count === 1 ? stringifyLabel(collection.labels?.singular) : stringifyLabel(collection.labels?.plural)) ?? collection.slug;
    const selectionParams = ()=>{
        const params = new URLSearchParams();
        selectedIds.forEach((id)=>params.append('where[id][in][]', String(id)));
        params.append('trash', 'true');
        // Scope the request to the active locale. Without this, restore-as-published
        // sets `_status: 'published'` for ALL locales, so required localized fields
        // that are empty in other locales fail validation (only the active locale
        // gets published, matching how the doc is edited per-locale).
        if (localeCode) params.append('locale', localeCode);
        return params;
    };
    const runRestore = async ()=>{
        setBusy(true);
        try {
            const body = {
                deletedAt: null
            };
            if (draftsEnabled) {
                body._status = restoreAsPublished ? 'published' : 'draft';
            }
            const res = await fetch(`/api/${collectionSlug}?${selectionParams()}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                throw new Error(`${res.status}`);
            }
            toast.success(t('general:restoredCountSuccessfully', {
                count,
                label
            }));
            setRestoreOpen(false);
            table.resetRowSelection();
            router.refresh();
        } catch  {
            toast.error(t('error:unknown'));
        } finally{
            setBusy(false);
        }
    };
    const handlePermanentDelete = async ()=>{
        if (!window.confirm(`${t('general:permanentlyDelete')}: ${count} ${label}?`)) {
            return;
        }
        setBusy(true);
        try {
            const res = await fetch(`/api/${collectionSlug}?${selectionParams()}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) {
                throw new Error(`${res.status}`);
            }
            toast.success(t('general:permanentlyDeletedCountSuccessfully', {
                count,
                label
            }));
            table.resetRowSelection();
            router.refresh();
        } catch  {
            toast.error(t('error:unknown'));
        } finally{
            setBusy(false);
        }
    };
    const openRestore = ()=>{
        if (draftsEnabled) {
            setRestoreAsPublished(false);
            setRestoreOpen(true);
            return;
        }
        if (window.confirm(t('general:aboutToRestoreCount', {
            count,
            label
        }))) {
            void runRestore();
        }
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-2",
        children: [
            canRestore ? /*#__PURE__*/ _jsxs(Button, {
                size: "sm",
                variant: "outline",
                onClick: openRestore,
                disabled: busy,
                children: [
                    /*#__PURE__*/ _jsx(ArchiveRestore, {
                        className: "mr-2 h-4 w-4"
                    }),
                    t('general:restore')
                ]
            }) : null,
            canDelete ? /*#__PURE__*/ _jsxs(Button, {
                size: "sm",
                variant: "destructive",
                onClick: handlePermanentDelete,
                disabled: busy,
                children: [
                    /*#__PURE__*/ _jsx(Trash2, {
                        className: "mr-2 h-4 w-4"
                    }),
                    t('general:permanentlyDelete')
                ]
            }) : null,
            draftsEnabled ? /*#__PURE__*/ _jsx(Dialog, {
                open: restoreOpen,
                onOpenChange: setRestoreOpen,
                children: /*#__PURE__*/ _jsxs(DialogContent, {
                    className: "twp",
                    children: [
                        /*#__PURE__*/ _jsxs(DialogHeader, {
                            children: [
                                /*#__PURE__*/ _jsx(DialogTitle, {
                                    children: t('general:confirmRestoration')
                                }),
                                /*#__PURE__*/ _jsx(DialogDescription, {
                                    children: t('general:aboutToRestoreAsDraftCount', {
                                        count,
                                        label
                                    })
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs("label", {
                            className: "flex items-center gap-2 text-sm",
                            children: [
                                /*#__PURE__*/ _jsx(Checkbox, {
                                    checked: restoreAsPublished,
                                    onCheckedChange: (v)=>setRestoreAsPublished(v === true)
                                }),
                                t('general:restoreAsPublished')
                            ]
                        }),
                        /*#__PURE__*/ _jsxs(DialogFooter, {
                            children: [
                                /*#__PURE__*/ _jsx(Button, {
                                    variant: "outline",
                                    size: "sm",
                                    onClick: ()=>setRestoreOpen(false),
                                    disabled: busy,
                                    children: t('general:cancel')
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    size: "sm",
                                    onClick: ()=>void runRestore(),
                                    disabled: busy,
                                    children: busy ? t('general:restoring') : t('general:restore')
                                })
                            ]
                        })
                    ]
                })
            }) : null
        ]
    });
}

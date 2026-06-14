'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Client table for the versions LIST view. Server-driven: the RSC
   (AutoVersionsView) fetches a page of versions and hands them here.
   Pagination writes to the URL (`?page=`) and lets the RSC refetch. Matches
   Payload's native list (snapshots excluded, all locales shown). Replaces the
   old 20-capped VersionsDialog. v3.9. */ import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Badge } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { persistedStatusPill, toneClassName } from '../drafts/statusPill.js';
const formatTimestamp = (iso)=>{
    try {
        return new Date(iso).toLocaleString();
    } catch  {
        return iso;
    }
};
export function VersionsList({ rows, basePath, page, totalPages }) {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const goToPage = (next)=>{
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.set('page', String(next));
        router.push(`?${params.toString()}`);
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ _jsx("div", {
                className: "rounded-md border",
                children: /*#__PURE__*/ _jsxs(Table, {
                    children: [
                        /*#__PURE__*/ _jsx(TableHeader, {
                            children: /*#__PURE__*/ _jsxs(TableRow, {
                                children: [
                                    /*#__PURE__*/ _jsx(TableHead, {
                                        children: t('general:updatedAt')
                                    }),
                                    /*#__PURE__*/ _jsx(TableHead, {
                                        children: t('version:status')
                                    }),
                                    /*#__PURE__*/ _jsx(TableHead, {
                                        children: t('shadcnAdmin:colType')
                                    })
                                ]
                            })
                        }),
                        /*#__PURE__*/ _jsx(TableBody, {
                            children: rows.length === 0 ? /*#__PURE__*/ _jsx(TableRow, {
                                children: /*#__PURE__*/ _jsx(TableCell, {
                                    colSpan: 3,
                                    className: "py-8 text-center text-sm text-muted-foreground",
                                    children: t('shadcnAdmin:noPriorVersions')
                                })
                            }) : rows.map((row)=>{
                                const pill = persistedStatusPill(row.status, t);
                                return /*#__PURE__*/ _jsxs(TableRow, {
                                    className: "cursor-pointer",
                                    children: [
                                        /*#__PURE__*/ _jsx(TableCell, {
                                            children: /*#__PURE__*/ _jsx("a", {
                                                href: `${basePath}/versions/${row.id}`,
                                                className: "font-medium hover:underline",
                                                children: formatTimestamp(row.updatedAt)
                                            })
                                        }),
                                        /*#__PURE__*/ _jsx(TableCell, {
                                            children: /*#__PURE__*/ _jsxs(Badge, {
                                                variant: "outline",
                                                className: cn('font-medium', toneClassName(pill.tone)),
                                                children: [
                                                    pill.label,
                                                    row.publishedLocale ? /*#__PURE__*/ _jsx("span", {
                                                        className: "ml-1 uppercase opacity-70",
                                                        children: row.publishedLocale
                                                    }) : null
                                                ]
                                            })
                                        }),
                                        /*#__PURE__*/ _jsx(TableCell, {
                                            className: "text-sm text-muted-foreground",
                                            children: row.autosave ? t('version:autosave') : t('shadcnAdmin:manualType')
                                        })
                                    ]
                                }, row.id);
                            })
                        })
                    ]
                })
            }),
            totalPages > 1 ? /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center justify-end gap-2",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        className: "text-sm text-muted-foreground",
                        children: t('shadcnAdmin:pageNofM', {
                            current: page,
                            total: totalPages
                        })
                    }),
                    /*#__PURE__*/ _jsx(Button, {
                        type: "button",
                        variant: "outline",
                        size: "sm",
                        disabled: page <= 1,
                        onClick: ()=>goToPage(page - 1),
                        children: t('shadcnAdmin:previous')
                    }),
                    /*#__PURE__*/ _jsx(Button, {
                        type: "button",
                        variant: "outline",
                        size: "sm",
                        disabled: page >= totalPages,
                        onClick: ()=>goToPage(page + 1),
                        children: t('shadcnAdmin:next')
                    })
                ]
            }) : null
        ]
    });
}

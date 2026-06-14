'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
export function DataTablePagination({ table, pageSizeOptions = [
    10,
    20,
    30,
    50,
    100
], showSelectedCount = false }) {
    const { t } = useTranslation();
    const pageSize = table.getState().pagination.pageSize;
    const pageIndex = table.getState().pagination.pageIndex;
    const pageCount = table.getPageCount();
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center justify-between px-2 py-3",
        children: [
            /*#__PURE__*/ _jsx("div", {
                className: "flex-1 text-sm text-muted-foreground",
                children: showSelectedCount && t('shadcnAdmin:rowsSelected', {
                    selected: table.getFilteredSelectedRowModel().rows.length,
                    total: table.getFilteredRowModel().rows.length
                })
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center gap-6 lg:gap-8",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ _jsx("p", {
                                className: "text-sm font-medium",
                                children: t('shadcnAdmin:rowsPerPage')
                            }),
                            /*#__PURE__*/ _jsxs(Select, {
                                value: `${pageSize}`,
                                onValueChange: (value)=>table.setPageSize(Number(value)),
                                children: [
                                    /*#__PURE__*/ _jsx(SelectTrigger, {
                                        className: "h-8 w-[5.25rem]",
                                        children: /*#__PURE__*/ _jsx(SelectValue, {
                                            placeholder: pageSize
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx(SelectContent, {
                                        side: "top",
                                        children: pageSizeOptions.map((size)=>/*#__PURE__*/ _jsx(SelectItem, {
                                                value: `${size}`,
                                                children: size
                                            }, size))
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        className: "flex w-[100px] items-center justify-center text-sm font-medium",
                        children: t('shadcnAdmin:pageNofM', {
                            current: pageIndex + 1,
                            total: Math.max(pageCount, 1)
                        })
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ _jsxs(Button, {
                                variant: "outline",
                                size: "icon",
                                className: "hidden size-8 lg:flex",
                                onClick: ()=>table.setPageIndex(0),
                                disabled: !table.getCanPreviousPage(),
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "sr-only",
                                        children: t('shadcnAdmin:firstPage')
                                    }),
                                    /*#__PURE__*/ _jsx(ChevronsLeft, {
                                        className: "h-4 w-4"
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs(Button, {
                                variant: "outline",
                                size: "icon",
                                className: "size-8",
                                onClick: ()=>table.previousPage(),
                                disabled: !table.getCanPreviousPage(),
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "sr-only",
                                        children: t('shadcnAdmin:previousPage')
                                    }),
                                    /*#__PURE__*/ _jsx(ChevronLeft, {
                                        className: "h-4 w-4"
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs(Button, {
                                variant: "outline",
                                size: "icon",
                                className: "size-8",
                                onClick: ()=>table.nextPage(),
                                disabled: !table.getCanNextPage(),
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "sr-only",
                                        children: t('shadcnAdmin:nextPage')
                                    }),
                                    /*#__PURE__*/ _jsx(ChevronRight, {
                                        className: "h-4 w-4"
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs(Button, {
                                variant: "outline",
                                size: "icon",
                                className: "hidden size-8 lg:flex",
                                onClick: ()=>table.setPageIndex(pageCount - 1),
                                disabled: !table.getCanNextPage(),
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "sr-only",
                                        children: t('shadcnAdmin:lastPage')
                                    }),
                                    /*#__PURE__*/ _jsx(ChevronsRight, {
                                        className: "h-4 w-4"
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

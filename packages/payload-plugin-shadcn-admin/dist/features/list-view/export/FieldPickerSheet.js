'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Field-picker for CSV export. Lists candidate fields with checkboxes,
   defaults to the columns currently visible in the table, then drives
   the paginated fetch + CSV download. Uses Sheet (consistent with
   BulkEditSheet) instead of a separate Dialog primitive. */ import * as React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Checkbox } from 'payload-plugin-shadcn-ui';
import { coerceCellValue, downloadCsv, rowsToCsv } from './csvExport.js';
const PAGE_SIZE = 500;
const DEFAULT_SOFT_CAP = 50_000;
const scopeTitle = (scope, selectedCount)=>{
    if (scope === 'selected') return `Export ${selectedCount} selected row${selectedCount === 1 ? '' : 's'}`;
    if (scope === 'filtered') return 'Export filtered rows';
    return 'Export all rows';
};
const scopeDescription = (scope)=>{
    if (scope === 'selected') return 'Only the rows you ticked will be exported.';
    if (scope === 'filtered') return 'Applies the current filter, search, and sort. Pagination is ignored — all matching rows are exported.';
    return 'Exports every row in this collection, ignoring filters and search.';
};
const today = ()=>{
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};
const buildBaseParams = (scope, selectedRowIds)=>{
    if (scope === 'selected') {
        const params = new URLSearchParams();
        for (const id of selectedRowIds){
            params.append('where[id][in][]', String(id));
        }
        return params;
    }
    if (scope === 'all') return new URLSearchParams();
    // filtered: clone current URL state, drop pagination + column-visibility keys
    const params = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
    params.delete('page');
    params.delete('limit');
    params.delete('columns');
    return params;
};
export function FieldPickerSheet({ open, onOpenChange, scope, collectionSlug, candidates, initialSelectedIds, selectedRowIds, rowSoftCap = DEFAULT_SOFT_CAP }) {
    const [checked, setChecked] = React.useState({});
    const [exporting, setExporting] = React.useState(false);
    const [progress, setProgress] = React.useState(null);
    const [error, setError] = React.useState(null);
    const cancelledRef = React.useRef(false);
    // Seed selection whenever the sheet opens or the candidate set changes.
    React.useEffect(()=>{
        if (!open) return;
        const initSet = new Set(initialSelectedIds);
        const next = {};
        for (const c of candidates){
            next[c.id] = initSet.has(c.id);
        }
        setChecked(next);
        setExporting(false);
        setProgress(null);
        setError(null);
        cancelledRef.current = false;
    }, [
        open,
        candidates,
        initialSelectedIds
    ]);
    const checkedIds = React.useMemo(()=>candidates.filter((c)=>checked[c.id]).map((c)=>c.id), [
        candidates,
        checked
    ]);
    const toggleAll = (value)=>{
        const next = {};
        for (const c of candidates)next[c.id] = value;
        setChecked(next);
    };
    const handleExport = async ()=>{
        if (checkedIds.length === 0) return;
        const pickedFields = candidates.filter((c)=>checked[c.id]);
        setExporting(true);
        setError(null);
        setProgress({
            done: 0,
            total: null
        });
        cancelledRef.current = false;
        try {
            const baseParams = buildBaseParams(scope, selectedRowIds);
            const docs = [];
            let page = 1;
            let total = null;
            let softCapPrompted = false;
            while(true){
                if (cancelledRef.current) throw new Error('Export cancelled.');
                const params = new URLSearchParams(baseParams.toString());
                params.set('depth', '0');
                params.set('limit', String(PAGE_SIZE));
                params.set('page', String(page));
                const res = await fetch(`/api/${collectionSlug}?${params.toString()}`, {
                    credentials: 'include'
                });
                if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
                const body = await res.json();
                const pageDocs = body.docs ?? [];
                docs.push(...pageDocs);
                total = typeof body.totalDocs === 'number' ? body.totalDocs : null;
                setProgress({
                    done: docs.length,
                    total
                });
                if (!body.hasNextPage) break;
                if (!softCapPrompted && docs.length >= rowSoftCap) {
                    softCapPrompted = true;
                    const proceed = window.confirm(`Already exported ${docs.length} rows. Continue?`);
                    if (!proceed) break;
                }
                page += 1;
            }
            const headers = pickedFields.map((f)=>f.label);
            const rows = docs.map((doc)=>pickedFields.map((f)=>coerceCellValue(f.field, doc[f.id])));
            const csv = rowsToCsv(headers, rows);
            downloadCsv(`${collectionSlug}-${scope}-${today()}.csv`, csv);
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed');
        } finally{
            setExporting(false);
        }
    };
    const allChecked = checkedIds.length === candidates.length;
    const noneChecked = checkedIds.length === 0;
    return /*#__PURE__*/ _jsx(Sheet, {
        open: open,
        onOpenChange: (next)=>{
            if (!next && exporting) {
                // Allow closing to cancel an in-flight export.
                cancelledRef.current = true;
            }
            onOpenChange(next);
        },
        children: /*#__PURE__*/ _jsxs(SheetContent, {
            className: "flex w-full flex-col gap-0 p-0 sm:max-w-md",
            children: [
                /*#__PURE__*/ _jsxs(SheetHeader, {
                    className: "border-b",
                    children: [
                        /*#__PURE__*/ _jsx(SheetTitle, {
                            children: scopeTitle(scope, selectedRowIds.length)
                        }),
                        /*#__PURE__*/ _jsx(SheetDescription, {
                            children: scopeDescription(scope)
                        })
                    ]
                }),
                error ? /*#__PURE__*/ _jsx("div", {
                    className: "border-b bg-destructive/10 px-4 py-2 text-sm text-destructive",
                    children: error
                }) : null,
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex items-center justify-between border-b px-4 py-2",
                    children: [
                        /*#__PURE__*/ _jsxs("span", {
                            className: "text-sm text-muted-foreground",
                            children: [
                                checkedIds.length,
                                " of ",
                                candidates.length,
                                " fields"
                            ]
                        }),
                        /*#__PURE__*/ _jsx("button", {
                            type: "button",
                            className: "text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50",
                            onClick: ()=>toggleAll(!allChecked),
                            disabled: exporting,
                            children: allChecked ? 'Deselect all' : 'Select all'
                        })
                    ]
                }),
                /*#__PURE__*/ _jsx("div", {
                    className: "flex-1 overflow-y-auto p-4",
                    children: candidates.length === 0 ? /*#__PURE__*/ _jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: "No exportable fields available on this collection."
                    }) : /*#__PURE__*/ _jsx("div", {
                        className: "flex flex-col gap-2",
                        children: candidates.map((c)=>/*#__PURE__*/ _jsxs("label", {
                                className: "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 hover:bg-muted/60",
                                children: [
                                    /*#__PURE__*/ _jsx(Checkbox, {
                                        checked: Boolean(checked[c.id]),
                                        onCheckedChange: (value)=>setChecked((prev)=>({
                                                    ...prev,
                                                    [c.id]: value === true
                                                })),
                                        disabled: exporting
                                    }),
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "text-sm",
                                        children: c.label
                                    }),
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "ml-auto text-xs text-muted-foreground",
                                        children: c.id
                                    })
                                ]
                            }, c.id))
                    })
                }),
                /*#__PURE__*/ _jsxs(SheetFooter, {
                    className: "flex-col items-stretch gap-2 border-t sm:flex-row sm:items-center sm:justify-between",
                    children: [
                        /*#__PURE__*/ _jsx("span", {
                            className: "text-xs text-muted-foreground",
                            children: progress ? progress.total !== null ? `Exported ${progress.done} / ${progress.total} rows…` : `Exported ${progress.done} rows…` : ' '
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "flex justify-end gap-2",
                            children: [
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    variant: "outline",
                                    size: "sm",
                                    onClick: ()=>onOpenChange(false),
                                    disabled: exporting,
                                    children: "Cancel"
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    size: "sm",
                                    disabled: exporting || noneChecked,
                                    onClick: handleExport,
                                    children: exporting ? 'Exporting…' : 'Export'
                                })
                            ]
                        })
                    ]
                })
            ]
        })
    });
}

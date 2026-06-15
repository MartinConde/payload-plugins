'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* Visual media-library picker for type:'upload' fields.

   Replaces the filename-only RelationshipPicker dropdown with a
   "Choose from library" button that opens a Dialog containing a
   searchable, paginated thumbnail grid of the target upload collection.

   Props contract is identical to RelationshipPicker (string | string[] | null
   value; same onChange shape) so it drops into UploadFieldInput's handlePick
   wiring without changes to the field's poly/hasMany merge logic.

   - Single (multi: false) — clicking a tile selects it and closes the dialog.
   - Multi  (multi: true)  — tiles toggle into a local selection set (pre-seeded
     from the incoming value); a footer Confirm button commits the full new
     selection. Cancel discards local changes. */ import * as React from 'react';
import { CheckIcon, FolderOpenIcon, UploadIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Skeleton } from 'payload-plugin-shadcn-ui';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { cn, useActiveLocale } from 'payload-plugin-shadcn-ui';
const LIMIT = 24;
export function MediaPickerDialog({ relatedSlug, useAsTitle, multi, value, onChange, disabled }) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [docs, setDocs] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const [page, setPage] = React.useState(1);
    // For multi mode: local copy of the selection, committed on Confirm only.
    const [localSelection, setLocalSelection] = React.useState([]);
    // Tracks whether the upcoming fetch is a load-more (append) vs. a new
    // search/open (replace). A ref avoids adding this flag to the effect deps.
    const appendRef = React.useRef(false);
    const activeLocale = useActiveLocale();
    // Normalise incoming value to an array of string IDs.
    const selectedIds = React.useMemo(()=>{
        if (value === null || value === undefined) return [];
        if (Array.isArray(value)) return value.map(String);
        return [
            String(value)
        ];
    }, [
        value
    ]);
    // Reset dialog state on open; snapshot the current selection for multi mode.
    React.useEffect(()=>{
        if (!open) return;
        appendRef.current = false;
        setSearch('');
        setPage(1);
        setDocs([]);
        setHasMore(false);
        if (multi) setLocalSelection(selectedIds.slice());
    // Intentionally omits selectedIds: snapshot the selection at open-time only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        open,
        multi
    ]);
    // Fetch — fires on open, search, page, slug, or locale change.
    // `appendRef.current` at the moment the effect runs decides append vs. replace.
    React.useEffect(()=>{
        if (!open) return;
        const isAppend = appendRef.current;
        appendRef.current = false;
        let cancelled = false;
        setLoading(true);
        // Debounce search changes (200 ms); load-more fires immediately.
        const delay = isAppend ? 0 : 200;
        const timer = setTimeout(()=>{
            void (async ()=>{
                try {
                    const params = new URLSearchParams();
                    if (search.trim().length > 0 && useAsTitle) {
                        params.set(`where[${useAsTitle}][like]`, search.trim());
                    }
                    params.set('limit', String(LIMIT));
                    params.set('page', String(page));
                    params.set('depth', '0');
                    params.set('draft', 'true');
                    if (activeLocale) params.set('locale', activeLocale);
                    const res = await fetch(`/api/${relatedSlug}?${params.toString()}`, {
                        credentials: 'include'
                    });
                    if (!res.ok || cancelled) return;
                    const body = await res.json();
                    if (cancelled) return;
                    const newDocs = (body.docs ?? []).map((d)=>({
                            id: String(d.id),
                            url: typeof d.url === 'string' ? d.url : null,
                            thumbnailURL: typeof d.thumbnailURL === 'string' ? d.thumbnailURL : null,
                            filename: typeof d.filename === 'string' ? d.filename : null,
                            mimeType: typeof d.mimeType === 'string' ? d.mimeType : null
                        }));
                    if (isAppend) {
                        setDocs((prev)=>[
                                ...prev,
                                ...newDocs
                            ]);
                    } else {
                        setDocs(newDocs);
                    }
                    setHasMore((body.totalPages ?? 1) > (body.page ?? page));
                } catch  {
                    if (!cancelled && !isAppend) setDocs([]);
                } finally{
                    if (!cancelled) setLoading(false);
                }
            })();
        }, delay);
        return ()=>{
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        open,
        search,
        page,
        relatedSlug,
        useAsTitle,
        activeLocale
    ]);
    // ── event handlers ────────────────────────────────────────────────────────
    const handleTileClick = (id)=>{
        if (!multi) {
            onChange(id);
            setOpen(false);
            return;
        }
        setLocalSelection((prev)=>prev.includes(id) ? prev.filter((x)=>x !== id) : [
                ...prev,
                id
            ]);
    };
    const handleConfirm = ()=>{
        onChange(localSelection.length > 0 ? localSelection : null);
        setOpen(false);
    };
    const handleLoadMore = ()=>{
        appendRef.current = true;
        setPage((p)=>p + 1);
    };
    const handleSearchChange = (term)=>{
        // Search change resets pagination (not a load-more append).
        appendRef.current = false;
        setPage(1);
        setSearch(term);
    };
    const hasSelection = selectedIds.length > 0;
    // ── render ────────────────────────────────────────────────────────────────
    return /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
            /*#__PURE__*/ _jsxs(Button, {
                type: "button",
                variant: "outline",
                size: "sm",
                disabled: disabled,
                onClick: ()=>setOpen(true),
                children: [
                    /*#__PURE__*/ _jsx(FolderOpenIcon, {
                        className: "size-3.5"
                    }),
                    /*#__PURE__*/ _jsx("span", {
                        className: "ml-1",
                        children: !multi && hasSelection ? t('shadcnAdmin:pickerChange') : t('shadcnAdmin:chooseFromLibrary')
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(Dialog, {
                open: open,
                onOpenChange: setOpen,
                children: /*#__PURE__*/ _jsxs(DialogContent, {
                    className: "flex max-h-[90vh] flex-col sm:max-w-3xl",
                    children: [
                        /*#__PURE__*/ _jsx(DialogHeader, {
                            children: /*#__PURE__*/ _jsx(DialogTitle, {
                                children: t('shadcnAdmin:mediaLibrary')
                            })
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "min-h-0 flex-1 overflow-y-auto",
                            children: [
                                /*#__PURE__*/ _jsx("div", {
                                    className: "mb-4",
                                    children: /*#__PURE__*/ _jsx(Input, {
                                        placeholder: t('shadcnAdmin:searchPlaceholder'),
                                        value: search,
                                        onChange: (e)=>handleSearchChange(e.target.value)
                                    })
                                }),
                                loading && docs.length === 0 ? /* Skeleton tiles while the first page loads */ /*#__PURE__*/ _jsx("div", {
                                    className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
                                    children: Array.from({
                                        length: LIMIT
                                    }).map((_, i)=>/*#__PURE__*/ _jsx(Skeleton, {
                                            className: "aspect-square rounded-md"
                                        }, i))
                                }) : docs.length === 0 ? /*#__PURE__*/ _jsx("p", {
                                    className: "py-6 text-center text-sm text-muted-foreground",
                                    children: t('general:noResultsFound')
                                }) : /*#__PURE__*/ _jsxs(_Fragment, {
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
                                            children: docs.map((doc)=>{
                                                const isSelected = multi ? localSelection.includes(doc.id) : selectedIds.includes(doc.id);
                                                const isImg = doc.mimeType?.startsWith('image/');
                                                const src = doc.thumbnailURL ?? doc.url ?? null;
                                                return /*#__PURE__*/ _jsxs("button", {
                                                    type: "button",
                                                    onClick: ()=>handleTileClick(doc.id),
                                                    className: cn('group relative overflow-hidden rounded-md border bg-card text-left transition-colors', 'hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', isSelected && 'border-primary ring-2 ring-primary'),
                                                    children: [
                                                        /*#__PURE__*/ _jsx("div", {
                                                            className: "aspect-square overflow-hidden bg-muted",
                                                            children: isImg && src ? // eslint-disable-next-line @next/next/no-img-element
                                                            /*#__PURE__*/ _jsx("img", {
                                                                src: src,
                                                                alt: doc.filename ?? '',
                                                                className: "size-full object-cover"
                                                            }) : /*#__PURE__*/ _jsx("div", {
                                                                className: "flex size-full items-center justify-center",
                                                                children: /*#__PURE__*/ _jsx(UploadIcon, {
                                                                    className: "size-8 text-muted-foreground"
                                                                })
                                                            })
                                                        }),
                                                        /*#__PURE__*/ _jsxs("div", {
                                                            className: "p-2",
                                                            children: [
                                                                /*#__PURE__*/ _jsx("p", {
                                                                    className: "truncate text-xs font-medium",
                                                                    children: doc.filename ?? doc.id
                                                                }),
                                                                doc.mimeType ? /*#__PURE__*/ _jsx("p", {
                                                                    className: "truncate text-[10px] text-muted-foreground",
                                                                    children: doc.mimeType
                                                                }) : null
                                                            ]
                                                        }),
                                                        isSelected ? /*#__PURE__*/ _jsx("div", {
                                                            className: "absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                                                            children: /*#__PURE__*/ _jsx(CheckIcon, {
                                                                className: "size-3"
                                                            })
                                                        }) : null
                                                    ]
                                                }, doc.id);
                                            })
                                        }),
                                        hasMore ? /*#__PURE__*/ _jsx("div", {
                                            className: "mt-4 flex justify-center pb-2",
                                            children: /*#__PURE__*/ _jsx(Button, {
                                                type: "button",
                                                variant: "outline",
                                                size: "sm",
                                                disabled: loading,
                                                onClick: handleLoadMore,
                                                children: loading ? '…' : t('shadcnAdmin:loadMore')
                                            })
                                        }) : null
                                    ]
                                })
                            ]
                        }),
                        multi ? /*#__PURE__*/ _jsxs(DialogFooter, {
                            children: [
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    variant: "outline",
                                    onClick: ()=>setOpen(false),
                                    children: t('general:cancel')
                                }),
                                /*#__PURE__*/ _jsx(Button, {
                                    type: "button",
                                    onClick: handleConfirm,
                                    children: localSelection.length > 0 ? t('shadcnAdmin:selectCount', {
                                        count: localSelection.length
                                    }) : t('general:select')
                                })
                            ]
                        }) : null
                    ]
                })
            })
        ]
    });
}

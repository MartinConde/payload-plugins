'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* Bulk-edit sheet for the auto list view. Covers every field type the doc form
   supports by reusing the doc form's own renderers (makeFieldTreeRenderer) — no
   second field-editor matrix.

   UX is a field-picker, not a render-everything form: the user adds one or more
   fields to set (structural containers are flattened to their inner leaves),
   fills them, then confirms a review diff before the PATCH fires. This keeps
   the drawer light even when richText / array / blocks are in play.

   Two-step flow:
   1. edit — pick fields and fill values. Picked fields are the explicit set to
      apply; removing a field drops it from the PATCH.
   2. review — confirms the diff before PATCH
      /api/{slug}?where[id][in][]=…&locale=<active> fires (one batch request).
   On 2xx we call onSuccess() (the caller clears selection + refreshes). On
   non-2xx the sheet stays on review and shows the server error inline.

   Write semantics:
   - leaves under the same container merge into one nested body (buildPatchBody);
   - array / blocks ship their whole value (Payload replaces them wholesale);
   - upload / relationship ship id(s) / poly envelopes as JSON (uploading a new
     file is handled inside UploadFieldInput — it creates the media doc and
     stores its id, so bulk never needs multipart);
   - localized leaves are projected to the active locale and the PATCH is scoped
     with ?locale=<active>, matching the doc form and trash-restore. */ import * as React from 'react';
import { PlusIcon, RotateCcwIcon } from 'lucide-react';
import { useConfig, useLocale, useTranslation } from '../../../internal/payloadAdapter.js';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { makeFieldTreeRenderer } from '../../doc-form/fieldTree/FieldTreeRenderer.js';
import { collectLocalizedSchemaPaths, getByPath, isObject, projectLocaleAtLeaves, setByPath, stripPathIndices } from '../../doc-form/fieldTree/sharedHelpers.js';
import { collectBulkEditableLeaves } from './bulkEditLeaves.js';
import { buildPatchBody } from './buildPatchBody.js';
import { useDocFormRichText } from '../../doc-form/richtext/useDocFormRichText.js';
const RICHTEXT_REFETCH_TYPES = new Set([
    'richText',
    'array',
    'blocks'
]);
const formatDiffValue = (value)=>{
    if (value === null) return '∅ (null)';
    if (value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        return `${value.length} item${value.length === 1 ? '' : 's'}`;
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};
export function BulkEditSheet({ collectionSlug, collection, selectedIds, useAsTitleBySlug, open, onOpenChange, onSuccess }) {
    const { t } = useTranslation();
    const [step, setStep] = React.useState('edit');
    const [pickedPaths, setPickedPaths] = React.useState([]);
    const [shim, setShim] = React.useState({});
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    // The admin's current locale (from Payload's app-wide state) is the default
    // target; the drawer also lets the user pick which locale to bulk-edit, since
    // the list view itself surfaces no locale switcher.
    const locale = useLocale();
    const adminLocale = locale && typeof locale === 'object' && 'code' in locale ? locale.code ?? null : null;
    const { config } = useConfig();
    const locales = config.localization ? config.localization.locales : [];
    const localizationEnabled = Boolean(adminLocale) && locales.length > 0;
    const [activeLocale, setActiveLocale] = React.useState(adminLocale);
    // Reset whenever the sheet opens or the selection changes.
    React.useEffect(()=>{
        if (!open) return;
        setStep('edit');
        setPickedPaths([]);
        setShim({});
        setSubmitting(false);
        setError(null);
        setActiveLocale(adminLocale);
    }, [
        open,
        selectedIds.length,
        adminLocale
    ]);
    const leaves = React.useMemo(()=>collectBulkEditableLeaves(collection.fields), [
        collection.fields
    ]);
    const leafByPath = React.useMemo(()=>{
        const m = new Map();
        for (const leaf of leaves)m.set(leaf.path, leaf);
        return m;
    }, [
        leaves
    ]);
    const available = React.useMemo(()=>leaves.filter((l)=>!pickedPaths.includes(l.path)), [
        leaves,
        pickedPaths
    ]);
    const localizedSchemaPaths = React.useMemo(()=>{
        const out = new Set();
        collectLocalizedSchemaPaths(collection.fields, '', out);
        return out;
    }, [
        collection.fields
    ]);
    const isPathLocalized = React.useCallback((path)=>localizationEnabled && localizedSchemaPaths.has(stripPathIndices(path)), [
        localizationEnabled,
        localizedSchemaPaths
    ]);
    const setValueAtPath = React.useCallback((path, next)=>{
        setShim((prev)=>{
            if (isPathLocalized(path) && activeLocale) {
                const cur = getByPath(prev, path);
                const merged = isObject(cur) ? {
                    ...cur,
                    [activeLocale]: next
                } : {
                    [activeLocale]: next
                };
                return setByPath(prev, path, merged);
            }
            return setByPath(prev, path, next);
        });
    }, [
        isPathLocalized,
        activeLocale
    ]);
    const getProjectedData = React.useCallback(()=>localizationEnabled && activeLocale ? projectLocaleAtLeaves(shim, collection.fields, activeLocale) : shim, [
        shim,
        localizationEnabled,
        activeLocale,
        collection.fields
    ]);
    // Refetch the standalone richText editors when a richText (or richText-
    // bearing array/blocks) field is picked, or the locale changes.
    const richTextTrigger = pickedPaths.filter((p)=>RICHTEXT_REFETCH_TYPES.has(leafByPath.get(p)?.type ?? '')).join('|');
    const richTextRendered = useDocFormRichText({
        collectionFields: collection.fields,
        collectionSlug,
        getProjectedData,
        trigger: richTextTrigger,
        activeLocale,
        operation: 'update'
    });
    const renderer = makeFieldTreeRenderer({
        values: shim,
        errors: {},
        activeLocale,
        localizationEnabled,
        disabled: submitting,
        setValueAtPath,
        richTextRendered,
        useAsTitleBySlug,
        operation: 'update',
        showFieldChrome: false,
        idPrefix: 'bulk-edit-'
    });
    const pick = (path)=>{
        setPickedPaths((prev)=>prev.includes(path) ? prev : [
                ...prev,
                path
            ]);
        setPickerOpen(false);
    };
    const unpick = (path)=>{
        setPickedPaths((prev)=>prev.filter((p)=>p !== path));
    };
    const count = selectedIds.length;
    const hasPicked = pickedPaths.length > 0;
    const handleApply = async ()=>{
        setSubmitting(true);
        setError(null);
        try {
            // Relationship / upload ids are already coerced to the right type at the
            // FieldInput layer (see inputs/relationshipId.ts).
            const projected = getProjectedData();
            const body = buildPatchBody(pickedPaths, projected);
            const params = new URLSearchParams();
            selectedIds.forEach((id)=>params.append('where[id][in][]', String(id)));
            // Scope to the active locale so required localized fields in OTHER
            // locales don't fail validation (mirrors the doc form / trash restore).
            if (activeLocale) params.append('locale', activeLocale);
            const res = await fetch(`/api/${collectionSlug}?${params.toString()}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                let message = `Update failed (${res.status})`;
                try {
                    const errBody = await res.json();
                    if (errBody?.errors?.[0]?.message) message = errBody.errors[0].message;
                    else if (errBody?.message) message = errBody.message;
                } catch  {
                // Body wasn't JSON; keep the status-derived message.
                }
                throw new Error(message);
            }
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        } finally{
            setSubmitting(false);
        }
    };
    // Inline (not a Popover): the drawer is a Radix Sheet whose scroll-lock
    // (react-remove-scroll) swallows wheel events on portaled content, so a
    // Popover list wouldn't scroll with the wheel. Rendering the picker inside
    // the Sheet keeps it within the allowed scroll container.
    const addFieldMenu = /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-2",
        children: [
            /*#__PURE__*/ _jsxs(Button, {
                type: "button",
                variant: "outline",
                size: "sm",
                className: "self-start",
                disabled: available.length === 0,
                onClick: ()=>setPickerOpen((o)=>!o),
                children: [
                    /*#__PURE__*/ _jsx(PlusIcon, {
                        className: "size-3.5"
                    }),
                    /*#__PURE__*/ _jsx("span", {
                        className: "ml-1",
                        children: t('shadcnAdmin:addField')
                    })
                ]
            }),
            pickerOpen && available.length > 0 ? /*#__PURE__*/ _jsxs(Command, {
                className: "rounded-md border",
                children: [
                    /*#__PURE__*/ _jsx(CommandInput, {
                        placeholder: t('shadcnAdmin:findFieldPlaceholder')
                    }),
                    /*#__PURE__*/ _jsxs(CommandList, {
                        children: [
                            /*#__PURE__*/ _jsx(CommandEmpty, {
                                children: t('shadcnAdmin:noFields')
                            }),
                            /*#__PURE__*/ _jsx(CommandGroup, {
                                children: available.map((leaf)=>/*#__PURE__*/ _jsxs(CommandItem, {
                                        value: `${leaf.label} ${leaf.path}`,
                                        onSelect: ()=>pick(leaf.path),
                                        children: [
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "truncate",
                                                children: leaf.label
                                            }),
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "ml-auto pl-2 text-[10px] uppercase tracking-wide text-muted-foreground",
                                                children: leaf.type
                                            })
                                        ]
                                    }, leaf.path))
                            })
                        ]
                    })
                ]
            }) : null
        ]
    });
    return /*#__PURE__*/ _jsx(Sheet, {
        open: open,
        onOpenChange: onOpenChange,
        children: /*#__PURE__*/ _jsxs(SheetContent, {
            className: "flex w-full flex-col gap-0 p-0 sm:max-w-lg",
            children: [
                /*#__PURE__*/ _jsxs(SheetHeader, {
                    className: "border-b",
                    children: [
                        /*#__PURE__*/ _jsx(SheetTitle, {
                            children: step === 'edit' ? t('shadcnAdmin:editCount', {
                                count
                            }) : t('shadcnAdmin:reviewChangesCount', {
                                count
                            })
                        }),
                        /*#__PURE__*/ _jsx(SheetDescription, {
                            children: step === 'edit' ? t('shadcnAdmin:editStepDesc') : t('shadcnAdmin:reviewStepDesc')
                        }),
                        localizationEnabled && locales.length > 1 ? /*#__PURE__*/ _jsxs("div", {
                            className: "flex items-center gap-2 pt-1",
                            children: [
                                /*#__PURE__*/ _jsx("span", {
                                    className: "text-xs text-muted-foreground",
                                    children: t('shadcnAdmin:editingLocale')
                                }),
                                /*#__PURE__*/ _jsxs(Select, {
                                    value: activeLocale ?? undefined,
                                    onValueChange: setActiveLocale,
                                    disabled: submitting,
                                    children: [
                                        /*#__PURE__*/ _jsx(SelectTrigger, {
                                            className: "h-7 w-auto gap-1 text-xs",
                                            "aria-label": t('shadcnAdmin:editingLocale'),
                                            children: /*#__PURE__*/ _jsx(SelectValue, {})
                                        }),
                                        /*#__PURE__*/ _jsx(SelectContent, {
                                            children: locales.map((l)=>/*#__PURE__*/ _jsx(SelectItem, {
                                                    value: l.code,
                                                    children: typeof l.label === 'string' ? l.label : l.code
                                                }, l.code))
                                        })
                                    ]
                                })
                            ]
                        }) : null
                    ]
                }),
                error ? /*#__PURE__*/ _jsx("div", {
                    className: "border-b bg-destructive/10 px-4 py-2 text-sm text-destructive",
                    children: error
                }) : null,
                /*#__PURE__*/ _jsx("div", {
                    className: "flex-1 overflow-y-auto p-4",
                    children: step === 'edit' ? /*#__PURE__*/ _jsxs("div", {
                        className: "flex flex-col gap-4",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                children: addFieldMenu
                            }),
                            pickedPaths.length === 0 ? /*#__PURE__*/ _jsx("p", {
                                className: "text-sm text-muted-foreground",
                                children: t('shadcnAdmin:noFieldsAddedYet')
                            }) : pickedPaths.map((path)=>{
                                const leaf = leafByPath.get(path);
                                if (!leaf) return null;
                                const description = leaf.field.admin?.description;
                                return /*#__PURE__*/ _jsxs("div", {
                                    className: "flex flex-col gap-1.5",
                                    children: [
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "flex items-center justify-between gap-2",
                                            children: [
                                                /*#__PURE__*/ _jsxs("label", {
                                                    htmlFor: `bulk-edit-${path}`,
                                                    className: "text-sm font-medium text-foreground",
                                                    children: [
                                                        leaf.label,
                                                        leaf.field.hasMany ? /*#__PURE__*/ _jsxs("span", {
                                                            className: "ml-1 text-xs text-muted-foreground",
                                                            children: [
                                                                "(",
                                                                t('shadcnAdmin:fieldMultiple'),
                                                                ")"
                                                            ]
                                                        }) : null
                                                    ]
                                                }),
                                                /*#__PURE__*/ _jsxs("button", {
                                                    type: "button",
                                                    onClick: ()=>unpick(path),
                                                    className: "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground",
                                                    "aria-label": t('shadcnAdmin:removeField', {
                                                        label: leaf.label
                                                    }),
                                                    children: [
                                                        /*#__PURE__*/ _jsx(RotateCcwIcon, {
                                                            className: "size-3"
                                                        }),
                                                        t('general:remove')
                                                    ]
                                                })
                                            ]
                                        }),
                                        description ? /*#__PURE__*/ _jsx("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: description
                                        }) : null,
                                        renderer.renderField(leaf.field, leaf.pathPrefix)
                                    ]
                                }, path);
                            })
                        ]
                    }) : /*#__PURE__*/ _jsx(ReviewList, {
                        pickedPaths: pickedPaths,
                        leafByPath: leafByPath,
                        projected: getProjectedData(),
                        count: count,
                        useAsTitleBySlug: useAsTitleBySlug
                    })
                }),
                /*#__PURE__*/ _jsx(SheetFooter, {
                    className: "flex-row justify-end gap-2 border-t",
                    children: step === 'edit' ? /*#__PURE__*/ _jsxs(_Fragment, {
                        children: [
                            /*#__PURE__*/ _jsx(Button, {
                                type: "button",
                                variant: "outline",
                                size: "sm",
                                onClick: ()=>onOpenChange(false),
                                children: t('general:cancel')
                            }),
                            /*#__PURE__*/ _jsx(Button, {
                                type: "button",
                                size: "sm",
                                disabled: !hasPicked,
                                onClick: ()=>{
                                    setError(null);
                                    setStep('review');
                                },
                                children: t('shadcnAdmin:reviewChanges')
                            })
                        ]
                    }) : /*#__PURE__*/ _jsxs(_Fragment, {
                        children: [
                            /*#__PURE__*/ _jsx(Button, {
                                type: "button",
                                variant: "outline",
                                size: "sm",
                                disabled: submitting,
                                onClick: ()=>setStep('edit'),
                                children: t('shadcnAdmin:back')
                            }),
                            /*#__PURE__*/ _jsx(Button, {
                                type: "button",
                                size: "sm",
                                disabled: submitting || !hasPicked,
                                onClick: handleApply,
                                children: submitting ? `${t('shadcnAdmin:applying')}…` : t('shadcnAdmin:applyToCount', {
                                    count
                                })
                            })
                        ]
                    })
                })
            ]
        })
    });
}
function ReviewList({ pickedPaths, leafByPath, projected, count, useAsTitleBySlug }) {
    const { t } = useTranslation();
    if (pickedPaths.length === 0) {
        return /*#__PURE__*/ _jsx("p", {
            className: "text-sm text-muted-foreground",
            children: t('shadcnAdmin:noChangesToApply')
        });
    }
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-3",
        children: [
            /*#__PURE__*/ _jsx("p", {
                className: "text-sm text-muted-foreground",
                children: t('shadcnAdmin:changesApplyIntro', {
                    count
                })
            }),
            /*#__PURE__*/ _jsx("dl", {
                className: "flex flex-col gap-2 rounded-md border bg-muted/30 p-3",
                children: pickedPaths.map((path)=>{
                    const leaf = leafByPath.get(path);
                    return /*#__PURE__*/ _jsxs("div", {
                        className: "flex flex-col gap-0.5 text-sm sm:flex-row sm:items-start sm:gap-3",
                        children: [
                            /*#__PURE__*/ _jsx("dt", {
                                className: "font-medium text-foreground sm:w-40 sm:shrink-0",
                                children: leaf?.label ?? path
                            }),
                            /*#__PURE__*/ _jsx("dd", {
                                className: "break-words text-muted-foreground",
                                children: /*#__PURE__*/ _jsx(ReviewValue, {
                                    field: leaf?.field,
                                    value: getByPath(projected, path),
                                    useAsTitleBySlug: useAsTitleBySlug
                                })
                            })
                        ]
                    }, path);
                })
            })
        ]
    });
}
/* Normalize a relationship/upload value into a flat list of {slug, id}, across
   single / hasMany / polymorphic-envelope shapes. */ const toRefEntries = (value, relationTo)=>{
    const single = (v)=>{
        if (v === null || v === undefined) return null;
        if (isObject(v) && 'value' in v && typeof v.relationTo === 'string') {
            const id = v.value;
            if (typeof id === 'string' || typeof id === 'number') return {
                slug: v.relationTo,
                id
            };
            return null;
        }
        if (typeof v === 'string' || typeof v === 'number') {
            const slug = Array.isArray(relationTo) ? relationTo[0] : relationTo;
            return slug ? {
                slug,
                id: v
            } : null;
        }
        return null;
    };
    const arr = Array.isArray(value) ? value : [
        value
    ];
    return arr.map(single).filter((e)=>e !== null);
};
/* Review-step value renderer. Relationship/upload fields resolve their ids to
   the related doc's `useAsTitle` (falling back to the id); other types use
   formatDiffValue. */ function ReviewValue({ field, value, useAsTitleBySlug }) {
    const isRef = field?.type === 'relationship' || field?.type === 'upload';
    const entries = React.useMemo(()=>isRef ? toRefEntries(value, field?.relationTo) : [], [
        isRef,
        value,
        field?.relationTo
    ]);
    const [titles, setTitles] = React.useState({});
    const key = entries.map((e)=>`${e.slug}:${e.id}`).join(',');
    React.useEffect(()=>{
        if (entries.length === 0) return;
        let cancelled = false;
        const bySlug = new Map();
        for (const e of entries){
            const list = bySlug.get(e.slug) ?? [];
            list.push(e.id);
            bySlug.set(e.slug, list);
        }
        void (async ()=>{
            const next = {};
            await Promise.all(Array.from(bySlug.entries()).map(async ([slug, ids])=>{
                const useAsTitle = useAsTitleBySlug[slug];
                const params = new URLSearchParams();
                params.set('depth', '0');
                params.set('limit', String(ids.length));
                ids.forEach((id)=>params.append('where[id][in][]', String(id)));
                try {
                    const res = await fetch(`/api/${slug}?${params.toString()}`, {
                        credentials: 'include'
                    });
                    if (!res.ok) return;
                    const body = await res.json();
                    for (const d of body.docs ?? []){
                        const t = useAsTitle ? d[useAsTitle] : undefined;
                        next[`${slug}:${String(d.id)}`] = typeof t === 'string' && t.length > 0 ? t : String(d.id);
                    }
                } catch  {
                // leave unresolved → falls back to id
                }
            }));
            if (!cancelled) setTitles(next);
        })();
        return ()=>{
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        key
    ]);
    if (!isRef) return /*#__PURE__*/ _jsx(_Fragment, {
        children: formatDiffValue(value)
    });
    if (entries.length === 0) return /*#__PURE__*/ _jsx(_Fragment, {
        children: formatDiffValue(value)
    });
    return /*#__PURE__*/ _jsx(_Fragment, {
        children: entries.map((e)=>titles[`${e.slug}:${e.id}`] ?? String(e.id)).join(', ')
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Custom shadcn replacement for Payload's native BulkUploadDrawer ("Add files").

   Drives upload-collection creates from two entry points:
   - the "Upload new" button on field-level type:'upload' / upload-relationship
     fields (UploadFieldInput), and
   - multi-file drops on an upload collection's /create page
     (CollectionUploadHeader).

   Each picked file becomes a row carrying its own copy of the target
   collection's fields. Rows render the FULL field tree via the shared
   `makeFieldTreeRenderer` (the same renderer the doc form and bulk-edit drawer
   use) — so every field type works, including group/tabs/array/blocks and
   richText. richText editors are fetched per row via `useDocFormRichText`
   (a getFormState round-trip), which only fires when the collection actually
   has richText/array/blocks fields. Localized fields are edited per-locale via
   a locale picker and projected to the active locale at submit.

   Rows submit sequentially via the shared `buildUploadFormData` wire-format
   helper — the same path the doc-form bridge uses — so the v3.23 R2
   client-direct upload branch can't drift. */ import * as React from 'react';
import { useUploadHandlers, useLocale, useConfig, useTranslation } from '../../../internal/payloadAdapter.js';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { collectLocalizedSchemaPaths, getByPath, isFieldRenderable, isObject, isRenderableHere, projectLocaleAtLeaves, setByPath, stripPathIndices } from '../fieldTree/sharedHelpers.js';
import { makeFieldTreeRenderer } from '../fieldTree/FieldTreeRenderer.js';
import { useDocFormRichText } from '../richtext/useDocFormRichText.js';
import { DropzoneInput } from '../inputs/DropzoneInput.js';
import { buildUploadFormData, parsePayloadErrorResponse } from './uploadWireFormat.js';
/* Field types whose presence means a getFormState round-trip is needed to
   render their (possibly richText-bearing) inner content. Mirrors bulk-edit. */ const FORM_STATE_TYPES = new Set([
    'richText',
    'array',
    'blocks'
]);
const schemaHasFormStateFields = (fields)=>{
    for (const f of fields){
        if (FORM_STATE_TYPES.has(f.type)) return true;
        if (f.fields && schemaHasFormStateFields(f.fields)) return true;
        if (f.tabs && f.tabs.some((t)=>schemaHasFormStateFields(t.fields))) return true;
        if (f.blocks && f.blocks.some((b)=>schemaHasFormStateFields(b.fields))) return true;
    }
    return false;
};
/* Top-level required scalar leaves (flattening only the transparent row /
   collapsible wrappers). Required fields nested inside named group/tabs or
   complex containers are validated by the server (their dotted-path errors map
   back into the renderer). */ const topLevelRequiredLeafNames = (fields)=>{
    const out = [];
    const walk = (list)=>{
        for (const f of list){
            if (f.type === 'row' || f.type === 'collapsible') {
                if (f.fields) walk(f.fields);
                continue;
            }
            if (f.name && f.required && isFieldRenderable(f) && !FORM_STATE_TYPES.has(f.type) && f.type !== 'group' && f.type !== 'tabs') {
                out.push(f.name);
            }
        }
    };
    walk(fields);
    return out;
};
const isEmptyValue = (v)=>v === undefined || v === null || v === '' || Array.isArray(v) && v.length === 0;
let rowCounter = 0;
const nextRowId = ()=>{
    rowCounter += 1;
    return `row-${rowCounter}-${Date.now()}`;
};
export function UploadNewDialog({ open, onOpenChange, collectionSlug, uploadCollectionsBySlug, useAsTitleBySlug, maxFiles, initialFiles, onSuccess }) {
    const { t } = useTranslation();
    const { getUploadHandler } = useUploadHandlers();
    const meta = uploadCollectionsBySlug[collectionSlug];
    const uploadConfig = meta && meta.upload ? meta.upload : undefined;
    const collectionFields = meta?.fields ?? [];
    // Localization (read app-wide state directly, like the bulk-edit drawer). The
    // locale picker only appears when the collection has localized fields AND more
    // than one locale is configured.
    const locale = useLocale();
    const adminLocale = locale && typeof locale === 'object' && 'code' in locale ? locale.code ?? null : null;
    const { config } = useConfig();
    const locales = config.localization ? config.localization.locales : [];
    const hasLocalizedFields = React.useMemo(()=>{
        const out = new Set();
        collectLocalizedSchemaPaths(collectionFields, '', out);
        return out.size > 0;
    }, [
        collectionFields
    ]);
    const localizationEnabled = Boolean(adminLocale) && hasLocalizedFields;
    const showLocalePicker = localizationEnabled && locales.length > 1;
    const [activeLocale, setActiveLocale] = React.useState(adminLocale);
    const singleFile = maxFiles === 1;
    const labelSingular = meta?.labels?.singular ?? collectionSlug;
    const requiredLeafNames = React.useMemo(()=>topLevelRequiredLeafNames(collectionFields), [
        collectionFields
    ]);
    const makeRow = React.useCallback((file)=>({
            id: nextRowId(),
            file,
            values: {},
            errors: {},
            topError: null,
            status: 'idle'
        }), []);
    const [rows, setRows] = React.useState([]);
    const [submitting, setSubmitting] = React.useState(false);
    // Seed rows from initialFiles whenever the dialog opens; reset on close and
    // reset the active locale to the admin's current locale.
    React.useEffect(()=>{
        if (!open) {
            setRows([]);
            setSubmitting(false);
            return;
        }
        setActiveLocale(adminLocale);
        const seed = initialFiles ?? [];
        const capped = singleFile ? seed.slice(0, 1) : seed;
        setRows(capped.map((f)=>makeRow(f)));
    // initialFiles identity is stable per open in practice; intentionally
    // narrow deps to the open transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        open
    ]);
    const canAddMore = singleFile ? rows.length < 1 : true;
    const addFiles = (files)=>{
        if (files.length === 0) return;
        setRows((prev)=>{
            const room = singleFile ? Math.max(0, 1 - prev.length) : files.length;
            const toAdd = files.slice(0, room).map((f)=>makeRow(f));
            return [
                ...prev,
                ...toAdd
            ];
        });
    };
    const replaceFile = (id, file)=>{
        setRows((prev)=>prev.map((r)=>r.id === id ? {
                    ...r,
                    file,
                    status: 'idle',
                    topError: null
                } : r));
    };
    const removeRow = (id)=>{
        setRows((prev)=>prev.filter((r)=>r.id !== id));
    };
    const setRowValues = (id, values)=>{
        setRows((prev)=>prev.map((r)=>r.id === id ? {
                    ...r,
                    values
                } : r));
    };
    const clearRowError = (id, path)=>{
        setRows((prev)=>prev.map((r)=>{
                if (r.id !== id || !(path in r.errors)) return r;
                const next = {
                    ...r.errors
                };
                delete next[path];
                return {
                    ...r,
                    errors: next
                };
            }));
    };
    // Client required check for one row (top-level leaves only), evaluated against
    // the locale-projected values so localized leaves resolve to the active slice.
    const clientErrors = (row)=>{
        if (requiredLeafNames.length === 0) return {};
        const projected = localizationEnabled && activeLocale ? projectLocaleAtLeaves(row.values, collectionFields, activeLocale) : row.values;
        const errs = {};
        for (const name of requiredLeafNames){
            if (isEmptyValue(getByPath(projected, name))) {
                errs[name] = 'This field is required.';
            }
        }
        return errs;
    };
    const handleUpload = async ()=>{
        if (rows.length === 0 || submitting) return;
        // Pre-flight: client required checks. Compute synchronously from the current
        // snapshot (a setRows updater runs later, so we can't read a flag set inside
        // it). Server validation covers nested/complex fields after submit.
        let blocked = false;
        const validated = rows.map((r)=>{
            if (r.status === 'done') return r;
            const errs = clientErrors(r);
            if (Object.keys(errs).length > 0) blocked = true;
            return {
                ...r,
                errors: errs
            };
        });
        if (blocked) {
            setRows(validated);
            return;
        }
        setSubmitting(true);
        const created = [];
        const working = validated;
        const localeQuery = activeLocale ? `?locale=${encodeURIComponent(activeLocale)}` : '';
        for (const row of working){
            if (row.status === 'done') {
                if (row.createdId !== undefined) created.push({
                    id: row.createdId,
                    slug: collectionSlug
                });
                continue;
            }
            setRows((prev)=>prev.map((r)=>r.id === row.id ? {
                        ...r,
                        status: 'uploading',
                        topError: null
                    } : r));
            try {
                const body = localizationEnabled && activeLocale ? projectLocaleAtLeaves(row.values, collectionFields, activeLocale) : row.values;
                const fd = await buildUploadFormData({
                    body: {
                        ...body
                    },
                    file: row.file,
                    collectionSlug,
                    getUploadHandler: getUploadHandler
                });
                const res = await fetch(`/api/${collectionSlug}${localeQuery}`, {
                    method: 'POST',
                    credentials: 'include',
                    body: fd
                });
                if (!res.ok) {
                    let parsed = {};
                    try {
                        parsed = await res.json();
                    } catch  {
                    // non-JSON body
                    }
                    const { fieldErrors, fallback } = parsePayloadErrorResponse(parsed);
                    setRows((prev)=>prev.map((r)=>r.id === row.id ? {
                                ...r,
                                status: 'error',
                                errors: fieldErrors,
                                topError: Object.keys(fieldErrors).length > 0 ? null : fallback ?? `Upload failed (${res.status})`
                            } : r));
                    continue;
                }
                const ok = await res.json();
                const id = ok.doc?.id;
                if (id !== undefined) created.push({
                    id,
                    slug: collectionSlug
                });
                setRows((prev)=>prev.map((r)=>r.id === row.id ? {
                            ...r,
                            status: 'done',
                            createdId: id
                        } : r));
            } catch (err) {
                setRows((prev)=>prev.map((r)=>r.id === row.id ? {
                            ...r,
                            status: 'error',
                            topError: err instanceof Error ? err.message : 'Upload failed.'
                        } : r));
            }
        }
        setSubmitting(false);
        if (created.length > 0) onSuccess(created);
        // Close only when every row succeeded; otherwise keep the dialog open so
        // the user sees the per-row errors and can retry.
        if (created.length === working.length) onOpenChange(false);
    };
    return /*#__PURE__*/ _jsx(Dialog, {
        open: open,
        onOpenChange: (next)=>submitting ? undefined : onOpenChange(next),
        children: /*#__PURE__*/ _jsxs(DialogContent, {
            className: "max-h-[85vh] overflow-y-auto sm:max-w-2xl",
            children: [
                /*#__PURE__*/ _jsxs(DialogHeader, {
                    children: [
                        /*#__PURE__*/ _jsx(DialogTitle, {
                            children: singleFile ? t('shadcnAdmin:uploadTitle', {
                                label: labelSingular
                            }) : t('shadcnAdmin:uploadTitleMultiple', {
                                label: labelSingular
                            })
                        }),
                        /*#__PURE__*/ _jsx(DialogDescription, {
                            children: singleFile ? t('shadcnAdmin:uploadDescription', {
                                label: labelSingular
                            }) : t('shadcnAdmin:uploadDescriptionMultiple', {
                                label: labelSingular
                            })
                        })
                    ]
                }),
                showLocalePicker ? /*#__PURE__*/ _jsxs("div", {
                    className: "flex items-center gap-2",
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
                }) : null,
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-col gap-4",
                    children: [
                        rows.map((row, idx)=>/*#__PURE__*/ _jsxs("div", {
                                className: cn('flex flex-col gap-3 rounded-md border p-3', row.status === 'error' && 'border-destructive', row.status === 'done' && 'border-emerald-500/50 opacity-80'),
                                children: [
                                    !singleFile ? /*#__PURE__*/ _jsx("span", {
                                        className: "text-xs font-medium text-muted-foreground",
                                        children: row.status === 'done' ? t('shadcnAdmin:fileRowUploaded', {
                                            number: idx + 1
                                        }) : row.status === 'uploading' ? t('shadcnAdmin:fileRowUploading', {
                                            number: idx + 1
                                        }) : t('shadcnAdmin:fileRow', {
                                            number: idx + 1
                                        })
                                    }) : null,
                                    /*#__PURE__*/ _jsx(DropzoneInput, {
                                        value: row.file,
                                        onChange: (f)=>f ? replaceFile(row.id, f) : removeRow(row.id),
                                        mimeTypes: uploadConfig?.mimeTypes,
                                        maxFileSize: uploadConfig?.maxFileSize,
                                        disabled: submitting || row.status === 'done'
                                    }),
                                    collectionFields.length > 0 ? /*#__PURE__*/ _jsx(UploadRowForm, {
                                        rowId: row.id,
                                        collectionSlug: collectionSlug,
                                        collectionFields: collectionFields,
                                        values: row.values,
                                        errors: row.errors,
                                        onValuesChange: (next)=>setRowValues(row.id, next),
                                        onErrorClear: (path)=>clearRowError(row.id, path),
                                        useAsTitleBySlug: useAsTitleBySlug,
                                        uploadCollectionsBySlug: uploadCollectionsBySlug,
                                        activeLocale: activeLocale,
                                        localizationEnabled: localizationEnabled,
                                        disabled: submitting || row.status === 'done'
                                    }) : null,
                                    row.topError ? /*#__PURE__*/ _jsx("p", {
                                        className: "text-xs text-destructive",
                                        children: row.topError
                                    }) : null
                                ]
                            }, row.id)),
                        canAddMore ? /*#__PURE__*/ _jsx(DropzoneInput, {
                            value: null,
                            onChange: (f)=>f ? addFiles([
                                    f
                                ]) : undefined,
                            onMultiDrop: (files)=>addFiles(Array.from(files)),
                            multiple: !singleFile,
                            mimeTypes: uploadConfig?.mimeTypes,
                            maxFileSize: uploadConfig?.maxFileSize,
                            disabled: submitting
                        }) : null
                    ]
                }),
                /*#__PURE__*/ _jsxs(DialogFooter, {
                    children: [
                        /*#__PURE__*/ _jsx(Button, {
                            type: "button",
                            variant: "outline",
                            onClick: ()=>onOpenChange(false),
                            disabled: submitting,
                            children: t('general:cancel')
                        }),
                        /*#__PURE__*/ _jsx(Button, {
                            type: "button",
                            onClick: ()=>{
                                void handleUpload();
                            },
                            disabled: submitting || rows.length === 0,
                            children: submitting ? `${t('general:uploading')}…` : rows.length > 1 ? t('shadcnAdmin:uploadFilesCount', {
                                count: rows.length
                            }) : t('shadcnAdmin:uploadSubmit')
                        })
                    ]
                })
            ]
        })
    });
}
/* One file's create form, rendered through the shared field-tree renderer so
   every field type (incl. group/tabs/array/blocks/richText) is supported.
   Owns its own richText fetch + locale-aware writes; the parent holds the
   row's value tree and orchestrates submit. A standalone component (not an
   inline map callback) so the per-row hooks obey the rules of hooks. */ function UploadRowForm({ rowId, collectionSlug, collectionFields, values, errors, onValuesChange, onErrorClear, useAsTitleBySlug, uploadCollectionsBySlug, activeLocale, localizationEnabled, disabled }) {
    const valuesRef = React.useRef(values);
    valuesRef.current = values;
    const localizedSchemaPaths = React.useMemo(()=>{
        const out = new Set();
        collectLocalizedSchemaPaths(collectionFields, '', out);
        return out;
    }, [
        collectionFields
    ]);
    const isPathLocalized = React.useCallback((path)=>localizationEnabled && localizedSchemaPaths.has(stripPathIndices(path)), [
        localizationEnabled,
        localizedSchemaPaths
    ]);
    const setValueAtPath = React.useCallback((path, next)=>{
        const prev = valuesRef.current;
        let updated;
        if (isPathLocalized(path) && activeLocale) {
            const cur = getByPath(prev, path);
            const merged = isObject(cur) ? {
                ...cur,
                [activeLocale]: next
            } : {
                [activeLocale]: next
            };
            updated = setByPath(prev, path, merged);
        } else {
            updated = setByPath(prev, path, next);
        }
        onValuesChange(updated);
        onErrorClear(path);
    }, [
        isPathLocalized,
        activeLocale,
        onValuesChange,
        onErrorClear
    ]);
    const getProjectedData = React.useCallback(()=>localizationEnabled && activeLocale ? projectLocaleAtLeaves(valuesRef.current, collectionFields, activeLocale) : valuesRef.current, [
        localizationEnabled,
        activeLocale,
        collectionFields
    ]);
    // Fetch richText editors once when the schema has form-state fields; refetch
    // on locale change (handled inside the hook's deps).
    const richTextTrigger = React.useMemo(()=>schemaHasFormStateFields(collectionFields) ? 'on' : '', [
        collectionFields
    ]);
    const richTextRendered = useDocFormRichText({
        collectionFields,
        collectionSlug,
        getProjectedData,
        trigger: richTextTrigger,
        activeLocale,
        operation: 'create'
    });
    const renderer = makeFieldTreeRenderer({
        values,
        errors,
        activeLocale,
        localizationEnabled,
        disabled,
        setValueAtPath,
        richTextRendered,
        useAsTitleBySlug,
        uploadCollectionsBySlug,
        operation: 'create',
        idPrefix: `upload-${rowId}-`
    });
    const topLevel = React.useMemo(()=>collectionFields.filter(isRenderableHere), [
        collectionFields
    ]);
    return /*#__PURE__*/ _jsx("div", {
        className: "flex flex-col gap-4",
        children: topLevel.map((f)=>renderer.renderChild(f, ''))
    });
}

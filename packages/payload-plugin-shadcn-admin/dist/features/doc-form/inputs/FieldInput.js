'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Per-field-type input switch, shared between the bulk-edit sheet and the
   auto doc form. Owns rendering only — labels, reset buttons, dirty/required
   chrome live in the caller. Semantics:
   - value: the current value (undefined = not yet touched).
   - onChange(next): emits the next value. Cleared text emits ''; cleared
     number/date emits null. Reset semantics (emit undefined to drop dirty
     state) live in the bulk-edit wrapper, not here.
   - id: input element id; defaults to a hash of field.name. Useful when the
     same form renders multiple inputs that share a name across boundaries.
   - nestedPath: full dotted path of this field within the form
     (e.g. `myArray.0.label`). Top-level fields pass `field.name`. Used by
     container inputs (array/blocks) to compose subfield paths for the
     bridge.
   - renderChild: a path-aware renderer the bridge passes down so container
     inputs can hand off subfield rendering back through the bridge. Without
     this, container types fall back to a stub message.
   - The per-field `field.custom['plugin-shadcn-admin'].input` override
     mirrors the verified `.cell` override pattern (see autoColumns.tsx).
     The override must be a client reference exported from a 'use client'
     module in the consumer's source. */ import * as React from 'react';
import { useTranslation } from '../../../internal/payloadAdapterUI.js';
import { Checkbox } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Textarea } from 'payload-plugin-shadcn-ui';
import { RadioGroup, RadioGroupItem } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { RelationshipPicker } from '../../../shared/RelationshipPicker.js';
import { MultiSelect, SearchableSelect, SEARCHABLE_SELECT_THRESHOLD } from './SelectInputs.js';
import { DateInput } from './DateInput.js';
import { PointInput } from './PointInput.js';
import { CodeInput } from './CodeInput.js';
import { JsonInput } from './JsonInput.js';
import { PolymorphicRelationshipInput } from './PolymorphicRelationshipInput.js';
import { ArrayInput } from './ArrayInput.js';
import { BlocksInput } from './BlocksInput.js';
import { RichTextInput } from './RichTextInput.js';
import { UploadFieldInput } from './UploadFieldInput.js';
import { coerceRelationshipValue } from './relationshipId.js';
const PLUGIN_NAMESPACE = 'plugin-shadcn-admin';
export const normalizeOptions = (options)=>{
    if (!options) return [];
    return options.map((opt)=>typeof opt === 'string' ? {
            value: opt,
            label: opt
        } : {
            value: String(opt.value),
            label: opt.label ?? String(opt.value)
        });
};
export function FieldInput(props) {
    const { field, value, useAsTitleBySlug, uploadCollectionsBySlug = {}, onChange, id, required, invalid, disabled, nestedPath, renderChild, richTextRendered, operation, fieldPerms } = props;
    const elementId = id ?? `field-${field.name}`;
    const ariaInvalid = invalid ? true : undefined;
    const invalidRing = 'aria-invalid:border-destructive aria-invalid:ring-destructive/40';
    const { t } = useTranslation();
    // Per-field input override — mirrors the .cell override resolver in
    // autoColumns.tsx. The override receives the same props the built-in switch
    // would have (plus `t` for translation); consumers can ignore the ones they
    // don't need.
    const overrideRaw = field.custom?.[PLUGIN_NAMESPACE]?.input;
    if (overrideRaw) {
        const Override = overrideRaw;
        return /*#__PURE__*/ _jsx(Override, {
            ...props,
            t: t
        });
    }
    switch(field.type){
        case 'text':
        case 'email':
            {
                return /*#__PURE__*/ _jsx(Input, {
                    id: elementId,
                    type: field.type === 'email' ? 'email' : 'text',
                    value: typeof value === 'string' ? value : '',
                    onChange: (e)=>onChange(e.target.value),
                    required: required,
                    disabled: disabled,
                    "aria-invalid": ariaInvalid,
                    className: invalidRing
                });
            }
        case 'textarea':
            {
                return /*#__PURE__*/ _jsx(Textarea, {
                    id: elementId,
                    value: typeof value === 'string' ? value : '',
                    onChange: (e)=>onChange(e.target.value),
                    rows: 3,
                    required: required,
                    disabled: disabled,
                    "aria-invalid": ariaInvalid,
                    className: invalidRing
                });
            }
        case 'number':
            {
                const stringVal = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
                return /*#__PURE__*/ _jsx(Input, {
                    id: elementId,
                    type: "number",
                    value: stringVal,
                    onChange: (e)=>{
                        const raw = e.target.value;
                        if (raw === '') {
                            onChange(null);
                            return;
                        }
                        const n = Number(raw);
                        onChange(Number.isFinite(n) ? n : raw);
                    },
                    required: required,
                    disabled: disabled,
                    "aria-invalid": ariaInvalid,
                    className: invalidRing
                });
            }
        case 'date':
            {
                const displayFormat = field.admin?.date?.displayFormat ?? '';
                const includesTime = /[Hhms]/.test(displayFormat);
                return /*#__PURE__*/ _jsx(DateInput, {
                    id: elementId,
                    value: value,
                    onChange: (next)=>onChange(next),
                    withTime: includesTime,
                    required: required,
                    invalid: invalid,
                    disabled: disabled
                });
            }
        case 'checkbox':
            {
                const checked = value === true;
                return /*#__PURE__*/ _jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                        /*#__PURE__*/ _jsx(Checkbox, {
                            id: elementId,
                            checked: checked,
                            onCheckedChange: (next)=>onChange(next === true),
                            disabled: disabled
                        }),
                        /*#__PURE__*/ _jsx("label", {
                            htmlFor: elementId,
                            className: "text-sm text-muted-foreground",
                            children: checked ? t('general:true') : t('general:false')
                        })
                    ]
                });
            }
        case 'radio':
            {
                const options = normalizeOptions(field.options);
                return /*#__PURE__*/ _jsx(RadioGroup, {
                    value: typeof value === 'string' ? value : '',
                    onValueChange: (next)=>onChange(next),
                    disabled: disabled,
                    "aria-invalid": ariaInvalid,
                    className: "gap-2",
                    children: options.map((opt)=>{
                        const optId = `${elementId}-${opt.value}`;
                        return /*#__PURE__*/ _jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ _jsx(RadioGroupItem, {
                                    id: optId,
                                    value: opt.value
                                }),
                                /*#__PURE__*/ _jsx("label", {
                                    htmlFor: optId,
                                    className: "text-sm",
                                    children: opt.label
                                })
                            ]
                        }, opt.value);
                    })
                });
            }
        case 'select':
            {
                const options = normalizeOptions(field.options);
                if (field.hasMany) {
                    return /*#__PURE__*/ _jsx(MultiSelect, {
                        id: elementId,
                        options: options,
                        value: Array.isArray(value) ? value.map((v)=>String(v)) : [],
                        onChange: (next)=>onChange(next),
                        invalid: invalid,
                        disabled: disabled
                    });
                }
                // Long option lists (e.g. a locale picker) get a searchable combobox;
                // short ones stay a plain dropdown (a search box for 2–3 options is
                // noise).
                if (options.length > SEARCHABLE_SELECT_THRESHOLD) {
                    return /*#__PURE__*/ _jsx(SearchableSelect, {
                        id: elementId,
                        options: options,
                        value: typeof value === 'string' ? value : '',
                        onChange: (next)=>onChange(next),
                        invalid: invalid,
                        disabled: disabled
                    });
                }
                return /*#__PURE__*/ _jsxs(Select, {
                    value: typeof value === 'string' ? value : '',
                    onValueChange: (next)=>onChange(next),
                    disabled: disabled,
                    children: [
                        /*#__PURE__*/ _jsx(SelectTrigger, {
                            id: elementId,
                            className: cn('w-full', invalidRing),
                            "aria-invalid": ariaInvalid,
                            children: /*#__PURE__*/ _jsx(SelectValue, {
                                placeholder: t('general:selectValue')
                            })
                        }),
                        /*#__PURE__*/ _jsx(SelectContent, {
                            children: options.map((opt)=>/*#__PURE__*/ _jsx(SelectItem, {
                                    value: opt.value,
                                    children: opt.label
                                }, opt.value))
                        })
                    ]
                });
            }
        case 'relationship':
            {
                if (Array.isArray(field.relationTo)) {
                    return /*#__PURE__*/ _jsx(PolymorphicRelationshipInput, {
                        id: elementId,
                        relationTo: field.relationTo,
                        hasMany: field.hasMany,
                        useAsTitleBySlug: useAsTitleBySlug,
                        value: value,
                        onChange: (next)=>onChange(coerceRelationshipValue(next)),
                        invalid: invalid,
                        disabled: disabled
                    });
                }
                if (!field.relationTo) {
                    return /*#__PURE__*/ _jsx("em", {
                        className: "text-xs text-muted-foreground",
                        children: "Unsupported"
                    });
                }
                const relatedSlug = field.relationTo;
                const useAsTitle = useAsTitleBySlug[relatedSlug];
                const excludeDescendantsPath = field.custom?.['plugin-shadcn-admin']?.excludeDescendantsVia;
                const normalized = value === null || value === undefined ? null : Array.isArray(value) ? value.map((v)=>String(v)) : typeof value === 'object' && 'id' in value ? String(value.id) : String(value);
                return /*#__PURE__*/ _jsx(RelationshipPicker, {
                    relatedSlug: relatedSlug,
                    useAsTitle: useAsTitle,
                    multi: Boolean(field.hasMany),
                    value: normalized,
                    onChange: (next)=>onChange(coerceRelationshipValue(next)),
                    excludeDescendantsPath: excludeDescendantsPath
                });
            }
        case 'point':
            {
                return /*#__PURE__*/ _jsx(PointInput, {
                    id: elementId,
                    value: value,
                    onChange: (next)=>onChange(next),
                    required: required,
                    invalid: invalid,
                    disabled: disabled
                });
            }
        case 'code':
            {
                return /*#__PURE__*/ _jsx(CodeInput, {
                    id: elementId,
                    value: value,
                    language: field.admin?.language,
                    onChange: (next)=>onChange(next),
                    required: required,
                    invalid: invalid,
                    disabled: disabled
                });
            }
        case 'json':
            {
                return /*#__PURE__*/ _jsx(JsonInput, {
                    id: elementId,
                    value: value,
                    onChange: (next)=>onChange(next),
                    required: required,
                    invalid: invalid,
                    disabled: disabled
                });
            }
        case 'array':
            {
                if (!renderChild || !nestedPath) {
                    return /*#__PURE__*/ _jsx("em", {
                        className: "text-xs text-muted-foreground",
                        children: "Array fields require a path-aware renderer."
                    });
                }
                return /*#__PURE__*/ _jsx(ArrayInput, {
                    id: elementId,
                    field: field,
                    value: value,
                    onChange: (next)=>onChange(next),
                    nestedPath: nestedPath,
                    renderChild: renderChild,
                    disabled: disabled,
                    rowPerms: fieldPerms
                });
            }
        case 'blocks':
            {
                if (!renderChild || !nestedPath) {
                    return /*#__PURE__*/ _jsx("em", {
                        className: "text-xs text-muted-foreground",
                        children: "Blocks fields require a path-aware renderer."
                    });
                }
                return /*#__PURE__*/ _jsx(BlocksInput, {
                    id: elementId,
                    field: field,
                    value: value,
                    onChange: (next)=>onChange(next),
                    nestedPath: nestedPath,
                    renderChild: renderChild,
                    disabled: disabled,
                    blockPerms: fieldPerms
                });
            }
        case 'upload':
            {
                // Field-level upload = relationship to one or more upload-collection
                // docs. Non-polymorphic: value is a doc id (or string[] when hasMany).
                // Polymorphic (v3.6, relationTo: string[]): value is `{ relationTo,
                // value }` (or an array of envelopes when hasMany), same shape as
                // PolymorphicRelationshipInput.
                if (!field.relationTo) {
                    return /*#__PURE__*/ _jsx("em", {
                        className: "text-xs text-muted-foreground",
                        children: "Unsupported"
                    });
                }
                return /*#__PURE__*/ _jsx(UploadFieldInput, {
                    id: elementId,
                    fieldName: field.name,
                    relationTo: field.relationTo,
                    hasMany: field.hasMany,
                    useAsTitleBySlug: useAsTitleBySlug,
                    uploadCollectionsBySlug: uploadCollectionsBySlug,
                    value: value,
                    onChange: (next)=>onChange(coerceRelationshipValue(next)),
                    disabled: disabled,
                    invalid: invalid
                });
            }
        case 'richText':
            {
                if (!nestedPath || !operation) {
                    return /*#__PURE__*/ _jsx("em", {
                        className: "text-xs text-muted-foreground",
                        children: "richText fields require a nested path and operation."
                    });
                }
                if (!richTextRendered) {
                    // No pre-rendered element: either initial form state didn't include
                    // this path (shouldn't happen for top-level / group / tabs) OR the
                    // bridge is currently rebuilding form state for this row after an
                    // array/blocks add/remove/reorder. Show a shimmer the size of the
                    // editor toolbar to keep layout stable.
                    return /*#__PURE__*/ _jsx("div", {
                        className: "h-32 w-full animate-pulse rounded-md border border-input bg-muted/30",
                        "aria-busy": "true",
                        "aria-label": "Loading editor…"
                    });
                }
                return /*#__PURE__*/ _jsx(RichTextInput, {
                    id: elementId,
                    path: nestedPath,
                    rendered: richTextRendered,
                    value: value,
                    onChange: (next)=>onChange(next),
                    operation: operation,
                    disabled: disabled
                });
            }
        // Presentational `ui` fields carry their component in the
        // `custom['plugin-shadcn-admin'].input` override (handled above); without
        // one there's nothing to render.
        case 'ui':
            return null;
        default:
            return /*#__PURE__*/ _jsxs("em", {
                className: "text-xs text-muted-foreground",
                children: [
                    "Unsupported field type: ",
                    field.type
                ]
            });
    }
}
// Re-exported so the existing `../inputs/FieldInput.js` public export path
// (see exports/client.ts) doesn't need to change.
export { SearchableSelect };

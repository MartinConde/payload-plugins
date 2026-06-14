'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from 'lucide-react';
import * as React from 'react';
import { DataTableColumnHeader } from '../data-table/DataTableColumnHeader.js';
import { pickFieldNames } from './fieldPicker.js';
const PLUGIN_NAMESPACE = 'plugin-shadcn-admin';
const EM_DASH = '—';
const stringifyLabel = (value)=>{
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
        for (const v of Object.values(value)){
            if (typeof v === 'string') return v;
        }
    }
    return null;
};
const titleCase = (name)=>name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
const labelFor = (field, fallback)=>stringifyLabel(field.label) ?? titleCase(field.name ?? fallback);
const truncate = (s, n)=>s.length > n ? s.slice(0, n - 1) + '…' : s;
const isEmpty = (v)=>v === null || v === undefined || v === '';
const formatDate = (value, displayFormat)=>{
    if (isEmpty(value)) return EM_DASH;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return EM_DASH;
    // displayFormat is a date-fns token string; we don't ship date-fns, so we
    // ignore the token and use the locale-aware short format as documented.
    // Consumers who need full format control should ship their own list view.
    void displayFormat;
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};
const formatNumber = (value)=>{
    if (isEmpty(value)) return EM_DASH;
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return new Intl.NumberFormat().format(n);
};
const optionLabel = (options, value)=>{
    if (isEmpty(value)) return EM_DASH;
    if (!options) return String(value);
    for (const opt of options){
        if (typeof opt === 'string') {
            if (opt === value) return opt;
        } else if (opt.value === value) {
            return stringifyLabel(opt.label) ?? String(opt.value);
        }
    }
    return String(value);
};
const relatedTitle = (related, useAsTitle)=>{
    if (isEmpty(related)) return EM_DASH;
    if (typeof related !== 'object') return String(related);
    const obj = related;
    if (useAsTitle && !isEmpty(obj[useAsTitle])) return String(obj[useAsTitle]);
    if (!isEmpty(obj.id)) return String(obj.id);
    return EM_DASH;
};
/* Walk a Lexical AST (`{ root: { children: [...] } }`) or a Slate-style
   array of nodes, collecting text. Defensive against arbitrary shapes. */ const extractLexicalText = (value, maxChars)=>{
    const parts = [];
    let budget = maxChars * 4 // bail early on huge docs
    ;
    const visit = (node)=>{
        if (budget <= 0) return;
        if (node == null) return;
        if (typeof node === 'string') {
            parts.push(node);
            budget -= node.length;
            return;
        }
        if (Array.isArray(node)) {
            for (const child of node){
                if (budget <= 0) break;
                visit(child);
            }
            return;
        }
        if (typeof node !== 'object') return;
        const obj = node;
        if (typeof obj.text === 'string') {
            parts.push(obj.text);
            budget -= obj.text.length;
        }
        if (obj.children) visit(obj.children);
        if (obj.root) visit(obj.root);
    };
    try {
        visit(value);
    } catch  {
        return '';
    }
    const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
    return truncate(joined, maxChars);
};
const summarizeArray = (value, field)=>{
    if (!Array.isArray(value)) return EM_DASH;
    const n = value.length;
    const singular = stringifyLabel(field.labels?.singular) ?? 'item';
    const plural = stringifyLabel(field.labels?.plural) ?? 'items';
    return `${n} ${n === 1 ? singular : plural}`;
};
const summarizeBlocks = (value)=>{
    if (!Array.isArray(value)) return EM_DASH;
    const n = value.length;
    const seen = new Set();
    const slugs = [];
    for (const item of value){
        if (item && typeof item === 'object') {
            const slug = item.blockType;
            if (typeof slug === 'string' && !seen.has(slug)) {
                seen.add(slug);
                slugs.push(slug);
            }
        }
    }
    if (slugs.length === 0) return `${n} blocks`;
    return `${n} blocks (${truncate(slugs.join(', '), 40)})`;
};
const SCALAR_PREFERRED_KEYS = [
    'title',
    'name',
    'label'
];
const isScalar = (v)=>typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
const summarizeGroup = (value)=>{
    if (value == null || typeof value !== 'object' || Array.isArray(value)) return EM_DASH;
    const obj = value;
    for (const key of SCALAR_PREFERRED_KEYS){
        const v = obj[key];
        if (isScalar(v) && !isEmpty(v)) return String(v);
    }
    for (const v of Object.values(obj)){
        if (isScalar(v) && !isEmpty(v)) return String(v);
    }
    return EM_DASH;
};
const formatPoint = (value)=>{
    if (!Array.isArray(value) || value.length !== 2) return EM_DASH;
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return EM_DASH;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};
const TypeBadge = ({ children })=>/*#__PURE__*/ _jsx("span", {
        className: "inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
        children: children
    });
/* Cell renderer for a single Payload field type. Receives the raw row value
   and returns a React node. Falls back to em-dash for null/undefined. */ const renderCellForField = (field, value, context)=>{
    if (isEmpty(value) && field.type !== 'checkbox') return EM_DASH;
    switch(field.type){
        case 'text':
        case 'email':
            return context.isUseAsTitle ? /*#__PURE__*/ _jsx("span", {
                className: "font-medium",
                children: String(value)
            }) : /*#__PURE__*/ _jsx("span", {
                children: String(value)
            });
        case 'textarea':
            return /*#__PURE__*/ _jsx("span", {
                className: "text-muted-foreground",
                children: truncate(String(value), 80)
            });
        case 'number':
            return /*#__PURE__*/ _jsx("span", {
                children: formatNumber(value)
            });
        case 'date':
            return /*#__PURE__*/ _jsx("span", {
                className: "text-muted-foreground",
                children: formatDate(value, field.admin?.date?.displayFormat)
            });
        case 'checkbox':
            return value ? /*#__PURE__*/ _jsx(Check, {
                className: "h-4 w-4",
                "aria-label": "true"
            }) : /*#__PURE__*/ _jsx("span", {
                className: "sr-only",
                children: "false"
            });
        case 'select':
        case 'radio':
            {
                if (field.hasMany && Array.isArray(value)) {
                    if (value.length === 0) return EM_DASH;
                    return /*#__PURE__*/ _jsx("span", {
                        children: value.map((v)=>optionLabel(field.options, v)).join(', ')
                    });
                }
                return /*#__PURE__*/ _jsx("span", {
                    children: optionLabel(field.options, value)
                });
            }
        case 'relationship':
            {
                if (Array.isArray(field.relationTo)) {
                    const renderOne = (v)=>{
                        if (v == null || typeof v !== 'object') return null;
                        const entry = v;
                        const slug = typeof entry.relationTo === 'string' ? entry.relationTo : undefined;
                        const doc = entry.value;
                        const useAsTitle = slug ? context.useAsTitleBySlug?.[slug] : undefined;
                        const title = relatedTitle(doc, useAsTitle);
                        return /*#__PURE__*/ _jsxs("span", {
                            className: "inline-flex items-center gap-1",
                            children: [
                                slug ? /*#__PURE__*/ _jsx(TypeBadge, {
                                    children: slug
                                }) : null,
                                /*#__PURE__*/ _jsx("span", {
                                    children: title
                                })
                            ]
                        });
                    };
                    if (field.hasMany && Array.isArray(value)) {
                        if (value.length === 0) return EM_DASH;
                        const shown = value.slice(0, 2).map(renderOne);
                        const more = value.length - shown.length;
                        return /*#__PURE__*/ _jsxs("span", {
                            className: "inline-flex flex-wrap items-center gap-1.5",
                            children: [
                                shown.map((node, i)=>/*#__PURE__*/ _jsx(React.Fragment, {
                                        children: node
                                    }, i)),
                                more > 0 ? /*#__PURE__*/ _jsxs("span", {
                                    className: "text-muted-foreground",
                                    children: [
                                        "+",
                                        more,
                                        " more"
                                    ]
                                }) : null
                            ]
                        });
                    }
                    return renderOne(value) ?? EM_DASH;
                }
                const relatedSlug = field.relationTo;
                const useAsTitle = relatedSlug ? context.useAsTitleBySlug?.[relatedSlug] : undefined;
                if (field.hasMany && Array.isArray(value)) {
                    if (value.length === 0) return EM_DASH;
                    const titles = value.slice(0, 2).map((v)=>relatedTitle(v, useAsTitle));
                    const more = value.length - titles.length;
                    return /*#__PURE__*/ _jsxs("span", {
                        children: [
                            titles.join(', '),
                            more > 0 ? ` +${more} more` : ''
                        ]
                    });
                }
                return /*#__PURE__*/ _jsx("span", {
                    children: relatedTitle(value, useAsTitle)
                });
            }
        case 'upload':
            {
                if (Array.isArray(field.relationTo)) {
                    return /*#__PURE__*/ _jsx("em", {
                        className: "text-muted-foreground",
                        children: "polymorphic upload"
                    });
                }
                if (typeof value === 'object' && value !== null) {
                    const obj = value;
                    const url = obj.thumbnailURL ?? obj.url;
                    const alt = obj.alt ?? '';
                    const filename = obj.filename ?? '';
                    const mimeType = obj.mimeType ?? '';
                    if (url && mimeType.startsWith('image/')) {
                        // eslint-disable-next-line @next/next/no-img-element
                        return /*#__PURE__*/ _jsx("img", {
                            src: url,
                            alt: alt || filename,
                            className: "h-8 w-8 rounded object-cover"
                        });
                    }
                    return /*#__PURE__*/ _jsx("span", {
                        children: filename || String(obj.id ?? EM_DASH)
                    });
                }
                return /*#__PURE__*/ _jsx("span", {
                    children: String(value)
                });
            }
        case 'code':
            return /*#__PURE__*/ _jsx("code", {
                className: "text-muted-foreground text-xs",
                children: truncate(String(value), 40)
            });
        case 'json':
            try {
                return /*#__PURE__*/ _jsx("code", {
                    className: "text-muted-foreground text-xs",
                    children: truncate(JSON.stringify(value), 60)
                });
            } catch  {
                return EM_DASH;
            }
        case 'richText':
            {
                const text = extractLexicalText(value, 60);
                if (!text) return EM_DASH;
                return /*#__PURE__*/ _jsx("span", {
                    className: "text-muted-foreground",
                    children: text
                });
            }
        case 'array':
            {
                if (!Array.isArray(value) || value.length === 0) return EM_DASH;
                return /*#__PURE__*/ _jsx("span", {
                    children: summarizeArray(value, field)
                });
            }
        case 'blocks':
            {
                if (!Array.isArray(value) || value.length === 0) return EM_DASH;
                return /*#__PURE__*/ _jsx("span", {
                    children: summarizeBlocks(value)
                });
            }
        case 'group':
        case 'tab':
        case 'tabs':
            {
                const s = summarizeGroup(value);
                if (s === EM_DASH) return EM_DASH;
                return /*#__PURE__*/ _jsx("span", {
                    children: s
                });
            }
        case 'point':
            {
                const s = formatPoint(value);
                if (s === EM_DASH) return EM_DASH;
                return /*#__PURE__*/ _jsx("span", {
                    className: "text-muted-foreground tabular-nums",
                    children: s
                });
            }
        default:
            return /*#__PURE__*/ _jsx("em", {
                className: "text-muted-foreground",
                children: field.type
            });
    }
};
const SORTABLE_TYPES = new Set([
    'text',
    'textarea',
    'email',
    'number',
    'date',
    'checkbox',
    'radio',
    'select'
]);
const isSortable = (field)=>{
    if (field.hasMany) return false;
    return SORTABLE_TYPES.has(field.type);
};
/* Synthetic "fields" for id / createdAt / updatedAt — Payload doesn't list
   these in collection.fields but they're always present on the row. */ const SYNTHETIC_FIELDS = {
    id: {
        type: 'text',
        name: 'id',
        label: 'ID'
    },
    createdAt: {
        type: 'date',
        name: 'createdAt',
        label: 'Created'
    },
    updatedAt: {
        type: 'date',
        name: 'updatedAt',
        label: 'Updated'
    }
};
const isExcluded = (field)=>Boolean(field.hidden || field.admin?.hidden || field.admin?.disableListColumn);
const findField = (collection, name)=>{
    if (SYNTHETIC_FIELDS[name]) return SYNTHETIC_FIELDS[name];
    return collection.fields.find((f)=>f.name === name);
};
export function buildColumnsForCollection({ collection, useAsTitleBySlug, nativeCellFieldNames, nativeCellsByRow }) {
    const useAsTitle = collection.admin?.useAsTitle;
    const names = pickFieldNames(collection);
    const columns = [];
    for (const name of names){
        const field = findField(collection, name);
        if (!field) continue;
        if (isExcluded(field)) continue;
        const title = labelFor(field, name);
        const sortable = isSortable(field);
        // Cell resolution order (v3.20): (1) plugin escape hatch
        // `field.custom['plugin-shadcn-admin'].cell` — a client-ref function, takes
        // priority and is the recommended path for context-dependent Cells; (2) a
        // Payload-native `field.admin.components.Cell`, pre-rendered server-side and
        // looked up per row from `nativeCellsByRow`; (3) the built-in renderer.
        const override = field.custom?.[PLUGIN_NAMESPACE]?.cell;
        const hasNativeCell = Boolean(!override && nativeCellFieldNames?.includes(name));
        const fallbackCell = (ctx)=>renderCellForField(field, ctx.getValue(), {
                isUseAsTitle: name === useAsTitle,
                useAsTitleBySlug
            });
        const cell = override ?? (hasNativeCell ? (ctx)=>{
            const rowId = ctx.row.original?.id;
            const node = nativeCellsByRow?.[String(rowId)]?.[name];
            // Fall back if a row has no pre-rendered node (e.g. id missing).
            return node !== undefined ? node : fallbackCell(ctx);
        } : fallbackCell);
        columns.push({
            accessorKey: name,
            header: sortable ? ({ column })=>/*#__PURE__*/ _jsx(DataTableColumnHeader, {
                    column: column,
                    title: title
                }) : ()=>/*#__PURE__*/ _jsx("span", {
                    className: "text-xs font-medium",
                    children: title
                }),
            cell,
            enableSorting: sortable
        });
    }
    return columns;
}

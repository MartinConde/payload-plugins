'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Built-in cell renderer for a single Payload field type — the fallback used
   by buildColumnsForCollection when a field has no `.cell` override or
   pre-rendered native cell. Split out of autoColumns.tsx, which owns column
   assembly; this owns per-field-type rendering. */ import * as React from 'react';
import { Check } from 'lucide-react';
import { EM_DASH, extractLexicalText, formatDate, formatNumber, formatPoint, isEmpty, optionLabel, relatedTitle, summarizeArray, summarizeBlocks, summarizeGroup, truncate } from './cellFormatters.js';
const TypeBadge = ({ children })=>/*#__PURE__*/ _jsx("span", {
        className: "inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
        children: children
    });
/* Cell renderer for a single Payload field type. Receives the raw row value
   and returns a React node. Falls back to em-dash for null/undefined. */ export const renderCellForField = (field, value, context)=>{
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

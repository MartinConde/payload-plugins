'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* One row of the dnd-kit sortable tree: drag handle, expand toggle, compact
   summary / expanded edit fields, and the right-hand structural controls.
   Split out of MenuTreeEditor.tsx, which owns all tree state and passes this
   component pure props + callbacks. */ import * as React from 'react';
import { ChevronDownIcon, ChevronRightIcon, CopyIcon, ExternalLinkIcon, GripVerticalIcon, IndentDecreaseIcon, IndentIncreaseIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { DocPicker } from './DocPicker.js';
import { INDENT } from './menuTreeMutations.js';
export function SortableTreeItem({ item, depth, childCount, expanded, canIndent, canOutdent, canAddChild, disabled, linkableCollections, collectionLabels, useAsTitleBySlug, activeLocale, tr, onToggleExpand, onChange, onSelectDoc, onRemove, onDuplicate, onAddChild, onIndent, onOutdent }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id
    });
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        marginLeft: depth * INDENT
    };
    const relationTo = item.doc?.relationTo && linkableCollections.includes(item.doc.relationTo) ? item.doc.relationTo : linkableCollections[0];
    const setType = (type)=>onChange({
            type,
            doc: type === 'document' ? item.doc ?? {
                relationTo: linkableCollections[0],
                value: ''
            } : null,
            url: type === 'custom' ? item.url ?? '' : null
        });
    // Flag items with no usable link target (no document selected / empty URL).
    const isBroken = item.type === 'document' ? !item.doc?.value : !(item.url && item.url.trim());
    // One-line summary shown in the collapsed (compact) state.
    const summary = item.type === 'custom' ? item.url || '' : item.doc?.value ? collectionLabels[relationTo] ?? relationTo : tr('pluginMenus:linkDocument', 'Document');
    // Collapsed rows are a single centered line; expanded rows top-align so the
    // left/right icon columns sit beside the first input row.
    const sideMt = expanded ? 'mt-1' : '';
    return /*#__PURE__*/ _jsx(Card, {
        ref: setNodeRef,
        style: style,
        className: "gap-0 py-0",
        children: /*#__PURE__*/ _jsxs(CardContent, {
            className: `flex flex-row gap-2 px-2 py-1.5 ${expanded ? 'items-start' : 'items-center'}`,
            children: [
                /*#__PURE__*/ _jsx("button", {
                    type: "button",
                    ...attributes,
                    ...listeners,
                    disabled: disabled,
                    className: `${sideMt} shrink-0 cursor-grab text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50`,
                    "aria-label": tr('pluginMenus:dragToReorder', 'Drag to reorder'),
                    children: /*#__PURE__*/ _jsx(GripVerticalIcon, {
                        className: "size-4"
                    })
                }),
                /*#__PURE__*/ _jsx("button", {
                    type: "button",
                    onClick: onToggleExpand,
                    className: `${sideMt} shrink-0 text-muted-foreground hover:text-foreground`,
                    "aria-label": expanded ? tr('pluginMenus:collapse', 'Collapse') : tr('pluginMenus:expand', 'Expand'),
                    children: expanded ? /*#__PURE__*/ _jsx(ChevronDownIcon, {
                        className: "size-4"
                    }) : /*#__PURE__*/ _jsx(ChevronRightIcon, {
                        className: "size-4"
                    })
                }),
                expanded ? /*#__PURE__*/ _jsxs("div", {
                    className: "flex flex-1 flex-col gap-2.5",
                    children: [
                        /*#__PURE__*/ _jsxs("div", {
                            className: "flex flex-wrap items-center gap-2",
                            children: [
                                /*#__PURE__*/ _jsxs(Select, {
                                    value: item.type,
                                    disabled: disabled,
                                    onValueChange: (v)=>setType(v),
                                    children: [
                                        /*#__PURE__*/ _jsx(SelectTrigger, {
                                            className: "h-8 w-[8.5rem] shrink-0",
                                            children: /*#__PURE__*/ _jsx(SelectValue, {})
                                        }),
                                        /*#__PURE__*/ _jsxs(SelectContent, {
                                            children: [
                                                /*#__PURE__*/ _jsx(SelectItem, {
                                                    value: "document",
                                                    children: tr('pluginMenus:linkDocument', 'Document')
                                                }),
                                                /*#__PURE__*/ _jsx(SelectItem, {
                                                    value: "custom",
                                                    children: tr('pluginMenus:linkCustom', 'Custom URL')
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                item.type === 'document' ? /*#__PURE__*/ _jsxs(_Fragment, {
                                    children: [
                                        linkableCollections.length > 1 ? /*#__PURE__*/ _jsxs(Select, {
                                            value: relationTo,
                                            disabled: disabled,
                                            onValueChange: (slug)=>onSelectDoc(slug, ''),
                                            children: [
                                                /*#__PURE__*/ _jsx(SelectTrigger, {
                                                    className: "h-8 w-[10rem] shrink-0",
                                                    children: /*#__PURE__*/ _jsx(SelectValue, {})
                                                }),
                                                /*#__PURE__*/ _jsx(SelectContent, {
                                                    children: linkableCollections.map((slug)=>/*#__PURE__*/ _jsx(SelectItem, {
                                                            value: slug,
                                                            children: collectionLabels[slug] ?? slug
                                                        }, slug))
                                                })
                                            ]
                                        }) : null,
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "min-w-[12rem] flex-1",
                                            children: /*#__PURE__*/ _jsx(DocPicker, {
                                                relatedSlug: relationTo,
                                                useAsTitle: useAsTitleBySlug?.[relationTo],
                                                value: item.doc?.value || null,
                                                onChange: (v)=>onSelectDoc(relationTo, v ?? ''),
                                                activeLocale: activeLocale,
                                                disabled: disabled,
                                                placeholder: tr('pluginMenus:docSelectPlaceholder', 'Select a document…'),
                                                searchPlaceholder: tr('pluginMenus:docSearchPlaceholder', 'Search documents…'),
                                                emptyLabel: tr('pluginMenus:docNoResults', 'No documents found'),
                                                clearLabel: tr('pluginMenus:docClear', 'Clear selection')
                                            })
                                        }),
                                        item.doc?.value ? /*#__PURE__*/ _jsx("a", {
                                            href: `/admin/collections/${relationTo}/${item.doc.value}`,
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                            title: tr('pluginMenus:openDocument', 'Open linked document'),
                                            "aria-label": tr('pluginMenus:openDocument', 'Open linked document'),
                                            className: "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                                            children: /*#__PURE__*/ _jsx(ExternalLinkIcon, {
                                                className: "size-4"
                                            })
                                        }) : null
                                    ]
                                }) : /*#__PURE__*/ _jsx(Input, {
                                    value: item.url ?? '',
                                    disabled: disabled,
                                    placeholder: tr('pluginMenus:customUrlPlaceholder', 'https://… or /path'),
                                    onChange: (e)=>onChange({
                                            url: e.target.value
                                        }),
                                    className: "h-8 min-w-[12rem] flex-1"
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "flex flex-wrap items-center gap-3",
                            children: [
                                /*#__PURE__*/ _jsx(Input, {
                                    value: item.label,
                                    disabled: disabled,
                                    placeholder: tr('pluginMenus:labelPlaceholder', 'Menu label'),
                                    onChange: (e)=>onChange({
                                            label: e.target.value
                                        }),
                                    className: "h-8 min-w-[12rem] flex-1"
                                }),
                                /*#__PURE__*/ _jsxs("label", {
                                    className: "inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground",
                                    children: [
                                        /*#__PURE__*/ _jsx("input", {
                                            type: "checkbox",
                                            checked: item.newTab === true,
                                            disabled: disabled,
                                            onChange: (e)=>onChange({
                                                    newTab: e.target.checked
                                                }),
                                            className: "size-3.5 accent-primary"
                                        }),
                                        /*#__PURE__*/ _jsx(ExternalLinkIcon, {
                                            className: "size-3"
                                        }),
                                        tr('pluginMenus:openNewTab', 'Open in new tab')
                                    ]
                                }),
                                /*#__PURE__*/ _jsx(Input, {
                                    value: item.className ?? '',
                                    disabled: disabled,
                                    placeholder: tr('pluginMenus:cssClassPlaceholder', 'e.g. is-highlighted'),
                                    onChange: (e)=>onChange({
                                            className: e.target.value
                                        }),
                                    className: "h-8 w-[12rem] shrink-0",
                                    "aria-label": tr('pluginMenus:cssClassLabel', 'CSS class')
                                }),
                                isBroken ? /*#__PURE__*/ _jsxs("span", {
                                    className: "inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400",
                                    children: [
                                        /*#__PURE__*/ _jsx(TriangleAlertIcon, {
                                            className: "size-3.5"
                                        }),
                                        tr('pluginMenus:brokenLink', 'No link target set')
                                    ]
                                }) : null
                            ]
                        })
                    ]
                }) : /* Compact (collapsed): label + minimal info; click to expand. */ /*#__PURE__*/ _jsxs("button", {
                    type: "button",
                    onClick: onToggleExpand,
                    className: "flex min-h-[1.75rem] flex-1 items-center gap-2 overflow-hidden text-left",
                    children: [
                        isBroken ? /*#__PURE__*/ _jsx(TriangleAlertIcon, {
                            className: "size-3.5 shrink-0 text-amber-500",
                            "aria-label": tr('pluginMenus:brokenLink', 'No link target set')
                        }) : null,
                        /*#__PURE__*/ _jsx("span", {
                            className: `truncate text-sm font-medium ${item.label ? '' : 'italic text-muted-foreground'}`,
                            children: item.label || tr('pluginMenus:untitled', 'Untitled item')
                        }),
                        childCount > 0 ? /*#__PURE__*/ _jsx(Badge, {
                            variant: "secondary",
                            className: "shrink-0",
                            children: childCount
                        }) : null,
                        summary ? /*#__PURE__*/ _jsx("span", {
                            className: "ml-auto max-w-[45%] truncate text-xs text-muted-foreground",
                            children: summary
                        }) : null,
                        item.newTab ? /*#__PURE__*/ _jsx(ExternalLinkIcon, {
                            className: "size-3 shrink-0 text-muted-foreground"
                        }) : null
                    ]
                }),
                /*#__PURE__*/ _jsxs("div", {
                    className: "flex shrink-0 flex-col items-center gap-0.5",
                    children: [
                        /*#__PURE__*/ _jsx(IconButton, {
                            disabled: disabled,
                            onClick: onRemove,
                            destructive: true,
                            label: tr('pluginMenus:removeItem', 'Remove item'),
                            children: /*#__PURE__*/ _jsx(Trash2Icon, {
                                className: "size-4"
                            })
                        }),
                        expanded ? /*#__PURE__*/ _jsxs(_Fragment, {
                            children: [
                                /*#__PURE__*/ _jsx(IconButton, {
                                    disabled: disabled,
                                    onClick: onDuplicate,
                                    label: tr('pluginMenus:duplicateItem', 'Duplicate item'),
                                    children: /*#__PURE__*/ _jsx(CopyIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(IconButton, {
                                    disabled: disabled || !canOutdent,
                                    onClick: onOutdent,
                                    label: tr('pluginMenus:outdent', 'Move out one level'),
                                    children: /*#__PURE__*/ _jsx(IndentDecreaseIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(IconButton, {
                                    disabled: disabled || !canIndent,
                                    onClick: onIndent,
                                    label: tr('pluginMenus:indent', 'Nest under previous item'),
                                    children: /*#__PURE__*/ _jsx(IndentIncreaseIcon, {
                                        className: "size-4"
                                    })
                                }),
                                /*#__PURE__*/ _jsx(IconButton, {
                                    disabled: disabled || !canAddChild,
                                    onClick: onAddChild,
                                    label: tr('pluginMenus:addChild', 'Add sub-item'),
                                    children: /*#__PURE__*/ _jsx(PlusIcon, {
                                        className: "size-4"
                                    })
                                })
                            ]
                        }) : null
                    ]
                })
            ]
        })
    });
}
function IconButton({ disabled, onClick, label, destructive, children }) {
    return /*#__PURE__*/ _jsx("button", {
        type: "button",
        onClick: onClick,
        disabled: disabled,
        "aria-label": label,
        title: label,
        className: `flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${destructive ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-muted hover:text-foreground'}`,
        children: children
    });
}

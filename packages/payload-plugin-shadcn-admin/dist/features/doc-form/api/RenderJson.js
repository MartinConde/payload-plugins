'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from 'payload-plugin-shadcn-ui';
function Bracket({ type, position, comma = false }) {
    const bracket = position === 'end' ? type === 'object' ? '}' : ']' : type === 'object' ? '{' : '[';
    return /*#__PURE__*/ _jsxs("span", {
        className: "text-muted-foreground",
        children: [
            bracket,
            position === 'end' && comma ? ',' : null
        ]
    });
}
const valueColor = {
    array: '',
    object: '',
    string: 'text-emerald-600 dark:text-emerald-400',
    number: 'text-amber-600 dark:text-amber-400',
    boolean: 'text-blue-600 dark:text-blue-400',
    null: 'text-blue-600 dark:text-blue-400',
    date: 'text-emerald-600 dark:text-emerald-400'
};
export function RenderJson({ object, objectKey, parentType = 'object', isEmpty = false, trailingComma = false }) {
    const objectKeys = object && typeof object === 'object' ? Object.keys(object) : [];
    const objectLength = objectKeys.length;
    const [isOpen, setIsOpen] = React.useState(true);
    const isNested = parentType === 'object' || parentType === 'array';
    return /*#__PURE__*/ _jsxs("li", {
        className: cn('list-none', isNested && 'ml-4'),
        children: [
            /*#__PURE__*/ _jsxs("button", {
                "aria-label": "toggle",
                type: "button",
                onClick: ()=>setIsOpen(!isOpen),
                className: cn('inline-flex items-center gap-1 text-left hover:opacity-80', isEmpty && 'cursor-default'),
                children: [
                    isEmpty ? null : /*#__PURE__*/ _jsx(ChevronRight, {
                        className: cn('size-3 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-90')
                    }),
                    /*#__PURE__*/ _jsxs("span", {
                        className: cn(isEmpty && 'ml-4'),
                        children: [
                            objectKey && /*#__PURE__*/ _jsx("span", {
                                className: "text-foreground",
                                children: `"${objectKey}": `
                            }),
                            /*#__PURE__*/ _jsx(Bracket, {
                                position: "start",
                                type: parentType
                            }),
                            isEmpty ? /*#__PURE__*/ _jsx(Bracket, {
                                comma: trailingComma,
                                position: "end",
                                type: parentType
                            }) : null
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx("ul", {
                className: cn('border-l border-border', isNested && 'ml-1.5'),
                children: isOpen && object && typeof object === 'object' && objectKeys.map((key, keyIndex)=>{
                    let value = object[key];
                    let type;
                    const isLastKey = keyIndex === objectLength - 1;
                    if (value === null) {
                        type = 'null';
                    } else if (value instanceof Date) {
                        type = 'date';
                        value = value.toISOString();
                    } else if (Array.isArray(value)) {
                        type = 'array';
                    } else if (typeof value === 'object') {
                        type = 'object';
                    } else if (typeof value === 'number') {
                        type = 'number';
                    } else if (typeof value === 'boolean') {
                        type = 'boolean';
                    } else {
                        type = 'string';
                    }
                    if (type === 'object' || type === 'array') {
                        const v = value;
                        return /*#__PURE__*/ _jsx(RenderJson, {
                            isEmpty: Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0,
                            object: v,
                            objectKey: parentType === 'object' ? key : undefined,
                            parentType: type,
                            trailingComma: !isLastKey
                        }, `${key}-${keyIndex}`);
                    }
                    const parentHasKey = Boolean(parentType === 'object' && key);
                    return /*#__PURE__*/ _jsxs("li", {
                        className: cn('list-none', objectKey ? 'ml-4' : 'ml-4'),
                        children: [
                            parentHasKey ? /*#__PURE__*/ _jsx("span", {
                                className: "text-foreground",
                                children: `"${key}": `
                            }) : null,
                            /*#__PURE__*/ _jsx("span", {
                                className: valueColor[type],
                                children: JSON.stringify(value)
                            }),
                            isLastKey ? '' : ','
                        ]
                    }, `${key}-${keyIndex}`);
                })
            }),
            !isEmpty && /*#__PURE__*/ _jsx("span", {
                className: cn(isNested && 'ml-4'),
                children: /*#__PURE__*/ _jsx(Bracket, {
                    comma: trailingComma,
                    position: "end",
                    type: parentType
                })
            })
        ]
    });
}

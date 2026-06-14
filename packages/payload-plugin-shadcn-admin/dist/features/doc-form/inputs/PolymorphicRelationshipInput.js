'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Polymorphic relationship input. Payload stores polymorphic relationships
   as { value, relationTo } (single) or [{ value, relationTo }] (hasMany), and
   accepts the same shape on REST. This component wraps the existing
   RelationshipPicker (which only handles a single relationTo at a time) by
   first asking the user to pick a slug, then mounting RelationshipPicker for
   that slug. */ import * as React from 'react';
import { XIcon } from 'lucide-react';
import { Badge } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { RelationshipPicker } from '../../../shared/RelationshipPicker.js';
const normalizeIncoming = (v)=>{
    if (v === null || v === undefined) return [];
    const arr = Array.isArray(v) ? v : [
        v
    ];
    const out = [];
    for (const item of arr){
        if (item && typeof item === 'object') {
            const entry = item;
            if ((typeof entry.value === 'string' || typeof entry.value === 'number') && typeof entry.relationTo === 'string') {
                out.push({
                    value: entry.value,
                    relationTo: entry.relationTo
                });
            }
        }
    }
    return out;
};
export function PolymorphicRelationshipInput({ id, relationTo, hasMany, useAsTitleBySlug, value, onChange, invalid, disabled }) {
    const entries = React.useMemo(()=>normalizeIncoming(value), [
        value
    ]);
    const [slug, setSlug] = React.useState(entries[0]?.relationTo ?? relationTo[0] ?? '');
    const handlePick = (picked)=>{
        const pickedId = Array.isArray(picked) ? picked[0] : picked;
        if (!pickedId || !slug) return;
        const next = {
            value: pickedId,
            relationTo: slug
        };
        if (!hasMany) {
            onChange(next);
            return;
        }
        const exists = entries.some((e)=>String(e.value) === String(next.value) && e.relationTo === slug);
        if (exists) return;
        onChange([
            ...entries,
            next
        ]);
    };
    const removeEntry = (target)=>{
        if (!hasMany) {
            onChange(null);
            return;
        }
        onChange(entries.filter((e)=>!(String(e.value) === String(target.value) && e.relationTo === target.relationTo)));
    };
    // For single (hasMany=false), the current pick is the value passed down to
    // the inner picker so the chip shows up there. For hasMany, we render our
    // own badge list above the picker and pass null to the inner picker so each
    // pick acts as an "add" action.
    const innerValue = !hasMany && entries[0]?.relationTo === slug ? String(entries[0].value) : null;
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-2",
        children: [
            hasMany && entries.length > 0 ? /*#__PURE__*/ _jsx("div", {
                className: "flex flex-wrap gap-1",
                children: entries.map((e)=>/*#__PURE__*/ _jsxs(Badge, {
                        variant: "secondary",
                        className: "gap-1 pr-1",
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                className: "text-[10px] uppercase tracking-wide opacity-70",
                                children: e.relationTo
                            }),
                            /*#__PURE__*/ _jsx("span", {
                                className: "max-w-[10rem] truncate",
                                children: String(e.value)
                            }),
                            /*#__PURE__*/ _jsx("button", {
                                type: "button",
                                onClick: ()=>removeEntry(e),
                                disabled: disabled,
                                className: "hover:bg-muted-foreground/20 rounded-sm",
                                "aria-label": `Remove ${e.relationTo}:${e.value}`,
                                children: /*#__PURE__*/ _jsx(XIcon, {
                                    className: "size-3"
                                })
                            })
                        ]
                    }, `${e.relationTo}:${e.value}`))
            }) : null,
            /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-row gap-2",
                children: [
                    /*#__PURE__*/ _jsxs(Select, {
                        value: slug,
                        onValueChange: (next)=>setSlug(next),
                        disabled: disabled || relationTo.length === 0,
                        children: [
                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                id: id ? `${id}-slug` : undefined,
                                className: "w-40",
                                "aria-invalid": invalid ? true : undefined,
                                children: /*#__PURE__*/ _jsx(SelectValue, {
                                    placeholder: "Collection…"
                                })
                            }),
                            /*#__PURE__*/ _jsx(SelectContent, {
                                children: relationTo.map((s)=>/*#__PURE__*/ _jsx(SelectItem, {
                                        value: s,
                                        children: s
                                    }, s))
                            })
                        ]
                    }),
                    slug ? /*#__PURE__*/ _jsx("div", {
                        className: "flex-1",
                        children: /*#__PURE__*/ _jsx(RelationshipPicker, {
                            relatedSlug: slug,
                            useAsTitle: useAsTitleBySlug[slug],
                            multi: false,
                            value: innerValue,
                            onChange: handlePick
                        })
                    }) : null
                ]
            })
        ]
    });
}

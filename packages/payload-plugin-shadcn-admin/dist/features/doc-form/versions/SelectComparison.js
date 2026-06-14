'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* "Compare against" selector for the version diff view. Writes the chosen
   version id to `?versionFrom=` and lets the RSC refetch + rebuild the diff.
   Options are computed server-side (previous version / currently published /
   specific prior versions). v3.9. */ import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
const PREVIOUS = '__previous__';
export function SelectComparison({ options, selected }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const onChange = (value)=>{
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        if (value === PREVIOUS) params.delete('versionFrom');
        else params.set('versionFrom', value);
        router.push(`?${params.toString()}`);
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-2",
        children: [
            /*#__PURE__*/ _jsx("span", {
                className: "text-sm text-muted-foreground",
                children: "Compare against"
            }),
            /*#__PURE__*/ _jsxs(Select, {
                value: selected ?? PREVIOUS,
                onValueChange: onChange,
                children: [
                    /*#__PURE__*/ _jsx(SelectTrigger, {
                        className: "w-64",
                        size: "sm",
                        children: /*#__PURE__*/ _jsx(SelectValue, {})
                    }),
                    /*#__PURE__*/ _jsxs(SelectContent, {
                        children: [
                            /*#__PURE__*/ _jsx(SelectItem, {
                                value: PREVIOUS,
                                children: "Previous version"
                            }),
                            options.map((opt)=>/*#__PURE__*/ _jsx(SelectItem, {
                                    value: opt.value,
                                    children: opt.label
                                }, opt.value))
                        ]
                    })
                ]
            })
        ]
    });
}

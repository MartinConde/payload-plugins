"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
function Collapsible({ ...props }) {
    return /*#__PURE__*/ _jsx(CollapsiblePrimitive.Root, {
        "data-slot": "collapsible",
        ...props
    });
}
function CollapsibleTrigger({ ...props }) {
    return /*#__PURE__*/ _jsx(CollapsiblePrimitive.CollapsibleTrigger, {
        "data-slot": "collapsible-trigger",
        ...props
    });
}
function CollapsibleContent({ ...props }) {
    return /*#__PURE__*/ _jsx(CollapsiblePrimitive.CollapsibleContent, {
        "data-slot": "collapsible-content",
        ...props
    });
}
export { Collapsible, CollapsibleTrigger, CollapsibleContent };

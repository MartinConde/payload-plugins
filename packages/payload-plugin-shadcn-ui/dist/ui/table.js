"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { cn } from "../shared/utils.js";
function Table({ className, ...props }) {
    return /*#__PURE__*/ _jsx("div", {
        "data-slot": "table-container",
        className: "relative w-full overflow-x-auto",
        children: /*#__PURE__*/ _jsx("table", {
            "data-slot": "table",
            className: cn("w-full caption-bottom text-sm", className),
            ...props
        })
    });
}
function TableHeader({ className, ...props }) {
    return /*#__PURE__*/ _jsx("thead", {
        "data-slot": "table-header",
        className: cn("[&_tr]:border-b", className),
        ...props
    });
}
function TableBody({ className, ...props }) {
    return /*#__PURE__*/ _jsx("tbody", {
        "data-slot": "table-body",
        className: cn("[&_tr:last-child]:border-0", className),
        ...props
    });
}
function TableFooter({ className, ...props }) {
    return /*#__PURE__*/ _jsx("tfoot", {
        "data-slot": "table-footer",
        className: cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className),
        ...props
    });
}
function TableRow({ className, ...props }) {
    return /*#__PURE__*/ _jsx("tr", {
        "data-slot": "table-row",
        className: cn("border-b border-border transition-colors hover:bg-muted/40 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted/60", className),
        ...props
    });
}
function TableHead({ className, ...props }) {
    return /*#__PURE__*/ _jsx("th", {
        "data-slot": "table-head",
        className: cn("group/th h-11 px-3 text-left align-middle text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className),
        ...props
    });
}
function TableCell({ className, ...props }) {
    return /*#__PURE__*/ _jsx("td", {
        "data-slot": "table-cell",
        className: cn("px-3 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className),
        ...props
    });
}
function TableCaption({ className, ...props }) {
    return /*#__PURE__*/ _jsx("caption", {
        "data-slot": "table-caption",
        className: cn("mt-4 text-sm text-muted-foreground", className),
        ...props
    });
}
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption,  };

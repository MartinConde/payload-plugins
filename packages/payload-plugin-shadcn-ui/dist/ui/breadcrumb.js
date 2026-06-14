import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "../shared/utils.js";
function Breadcrumb({ ...props }) {
    return /*#__PURE__*/ _jsx("nav", {
        "aria-label": "breadcrumb",
        "data-slot": "breadcrumb",
        ...props
    });
}
function BreadcrumbList({ className, ...props }) {
    return /*#__PURE__*/ _jsx("ol", {
        "data-slot": "breadcrumb-list",
        className: cn("flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5", className),
        ...props
    });
}
function BreadcrumbItem({ className, ...props }) {
    return /*#__PURE__*/ _jsx("li", {
        "data-slot": "breadcrumb-item",
        className: cn("inline-flex items-center gap-1.5", className),
        ...props
    });
}
function BreadcrumbLink({ asChild, className, ...props }) {
    const Comp = asChild ? Slot.Root : "a";
    return /*#__PURE__*/ _jsx(Comp, {
        "data-slot": "breadcrumb-link",
        className: cn("transition-colors hover:text-foreground", className),
        ...props
    });
}
function BreadcrumbPage({ className, ...props }) {
    return /*#__PURE__*/ _jsx("span", {
        "data-slot": "breadcrumb-page",
        role: "link",
        "aria-disabled": "true",
        "aria-current": "page",
        className: cn("font-normal text-foreground", className),
        ...props
    });
}
function BreadcrumbSeparator({ children, className, ...props }) {
    return /*#__PURE__*/ _jsx("li", {
        "data-slot": "breadcrumb-separator",
        role: "presentation",
        "aria-hidden": "true",
        className: cn("[&>svg]:size-3.5", className),
        ...props,
        children: children ?? /*#__PURE__*/ _jsx(ChevronRight, {})
    });
}
function BreadcrumbEllipsis({ className, ...props }) {
    return /*#__PURE__*/ _jsxs("span", {
        "data-slot": "breadcrumb-ellipsis",
        role: "presentation",
        "aria-hidden": "true",
        className: cn("flex size-9 items-center justify-center", className),
        ...props,
        children: [
            /*#__PURE__*/ _jsx(MoreHorizontal, {
                className: "size-4"
            }),
            /*#__PURE__*/ _jsx("span", {
                className: "sr-only",
                children: "More"
            })
        ]
    });
}
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis,  };

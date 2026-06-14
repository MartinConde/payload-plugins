import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../shared/utils.js";
function Skeleton({ className, ...props }) {
    return /*#__PURE__*/ _jsx("div", {
        "data-slot": "skeleton",
        className: cn("animate-pulse rounded-md bg-accent", className),
        ...props
    });
}
export { Skeleton };

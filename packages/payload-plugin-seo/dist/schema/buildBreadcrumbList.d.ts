export type BreadcrumbItem = {
    /** Visible label for this crumb (use `meta.breadcrumbTitle` to override). */
    name: string;
    /** Absolute or site-relative URL of this crumb. */
    url?: string;
};
/**
 * Build a `BreadcrumbList` JSON-LD node. Positions are 1-based in trail order.
 * The last item conventionally omits `url` (the current page), but either form
 * is accepted.
 */
export declare function buildBreadcrumbList(items: BreadcrumbItem[] | null | undefined): Record<string, unknown>;

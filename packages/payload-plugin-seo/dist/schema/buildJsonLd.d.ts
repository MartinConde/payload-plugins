export type SchemaBlock = {
    blockType?: string;
    [key: string]: unknown;
};
export type OrganizationData = {
    name?: string;
    url?: string;
    /** Populated logo upload (object with `url`) or a URL string. */
    logo?: unknown;
    /** `sameAs` social profiles, as stored by the settings global. */
    sameAs?: Array<{
        url?: string;
    }> | string[];
};
export type BuildJsonLdOptions = {
    /** When provided, an Organization node is prepended (site-wide identity). */
    organization?: OrganizationData;
};
/**
 * Build an array of JSON-LD nodes from the stored `meta.schema` blocks. Each
 * node carries its own `@context`, so a frontend can emit them as separate
 * `<script>` tags or merge them into a single `@graph`. The `custom` block is
 * passed through verbatim (assumed to already be valid JSON-LD).
 */
export declare function buildJsonLd(blocks: SchemaBlock[] | null | undefined, options?: BuildJsonLdOptions): Record<string, unknown>[];

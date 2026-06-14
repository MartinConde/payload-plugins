import type { BlocksField } from 'payload';
export type BuildSchemaBlocksOptions = {
    /** Field name (the blocks persist at this key inside the meta group). */
    name?: string;
    /** Upload collection for image fields. */
    uploadsCollection: string;
    /** Localize text content fields. */
    localized: boolean;
};
/**
 * Curated structured-data builder. A `blocks` field where each block is one
 * schema.org type, exposing only the fields Google needs for the matching rich
 * result. Multiple blocks per document are supported (e.g. Article + FAQPage),
 * mirroring what Rank Math / Yoast allow. Stored data is mapped to JSON-LD by
 * the pure `buildJsonLd` helper (server virtual field or frontend).
 *
 * Label strategy: the block picker labels are translated via `seoT` (the most
 * visible surface). Shared concepts reuse existing `pluginSeo` keys
 * (`labelTitle`/`labelDescription`/`labelImage`/`labelUrl`/`labelType`).
 * schema.org-specific property names (sku, priceCurrency, ISO-8601 durations,
 * enum URLs, …) are left as plain English — they are technical vocabulary, the
 * same call already made for `'Open Graph'` / `'Twitter / X'` in metaField.ts.
 */
export declare const buildSchemaBlocksField: ({ name, uploadsCollection, localized, }: BuildSchemaBlocksOptions) => BlocksField;

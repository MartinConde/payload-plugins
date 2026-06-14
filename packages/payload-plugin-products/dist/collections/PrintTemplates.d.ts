import type { CollectionConfig } from 'payload';
export type BuildPrintTemplatesCollectionOptions = {
    slug: string;
    overrides?: Partial<CollectionConfig>;
};
/**
 * Builds the `print-templates` collection: reusable physical print sizes (mm)
 * referenced by product views. Field surface is intentionally minimal in
 * Phase 1 — just enough metadata for aspect-lock and downstream DPI checks.
 *
 * Access: read for anyone, writes restricted to authenticated users.
 */
export declare const buildPrintTemplatesCollection: ({ slug, overrides, }: BuildPrintTemplatesCollectionOptions) => CollectionConfig;

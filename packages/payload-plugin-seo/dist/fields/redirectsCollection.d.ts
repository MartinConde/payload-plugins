import type { CollectionConfig } from 'payload';
export type BuildRedirectsOptions = {
    slug: string;
    /** Collections selectable as internal redirect targets. */
    collections: string[];
    overrides?: Partial<CollectionConfig>;
};
/**
 * Redirects collection — one row per redirect, readable by any frontend
 * (`GET /api/{slug}`). Mirrors the official @payloadcms/plugin-redirects shape:
 * `from` (unique path) → `to` (internal doc or custom URL) with a 301/302 type.
 */
export declare const buildRedirectsCollection: ({ slug, collections, overrides, }: BuildRedirectsOptions) => CollectionConfig;

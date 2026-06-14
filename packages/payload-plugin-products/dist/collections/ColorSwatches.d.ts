import type { CollectionConfig } from 'payload';
export type BuildColorSwatchesCollectionOptions = {
    slug: string;
    /** Upload collection the optional `swatch` image relates to. */
    mediaCollectionSlug: string;
    overrides?: Partial<CollectionConfig>;
};
/**
 * Builds the `color-swatches` collection: globally-reusable color identities
 * referenced by a product's `colors` relationship. Each swatch carries its
 * own hex value plus an optional uploaded image (used by the Designer chip
 * strip when a flat hex doesn't represent the material — e.g. heathers).
 *
 * Access: read for anyone, writes restricted to authenticated users.
 */
export declare const buildColorSwatchesCollection: ({ slug, mediaCollectionSlug, overrides, }: BuildColorSwatchesCollectionOptions) => CollectionConfig;

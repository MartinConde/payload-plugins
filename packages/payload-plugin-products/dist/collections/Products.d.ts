import type { CollectionConfig } from 'payload';
export type BuildProductsCollectionOptions = {
    slug: string;
    /** Upload collection the per-(view,color) `mockup` upload relates to, and
     *  the one the editor fetches the mockup image (url + natural dimensions)
     *  from. */
    mediaCollectionSlug: string;
    /** Reusable physical-size print-templates collection slug. Each view's
     *  `printAreaTemplate` relationship points here. */
    printTemplatesSlug: string;
    /** Global color-swatches collection slug. Targeted by the product-level
     *  `colors` relationship and each view's per-color `colorMockups[].color`. */
    colorSwatchesSlug: string;
    /** Preset names offered in the Designer's "+ Add view" dropdown.
     *  Free-text names are still accepted alongside. */
    defaultViewPresets: string[];
    overrides?: Partial<CollectionConfig>;
};
/**
 * Builds the `products` collection — Phase 2 layout.
 *
 * Top-level admin tabs (unnamed, label-only — form paths stay flat):
 *   - General : title, slug, status, description, price
 *   - Designer: `views` array + `designerCanvas` ui field
 *   - Variants: placeholder (color matrix lands in Phase 3)
 *   - SEO     : empty group for downstream SEO plugin wiring
 *
 * The Phase 1 top-level `mockup` upload + single `printAreas` JSON field have
 * been REMOVED. Each view now carries its own mockup + print-area config;
 * physical mm live on the view (via `printAreaTemplate` ref or custom
 * widthMm/heightMm). No data migration ships in this phase — existing v0.1.1
 * docs lose those fields on first save under v0.2.
 */
export declare const buildProductsCollection: ({ slug, mediaCollectionSlug, printTemplatesSlug, colorSwatchesSlug, defaultViewPresets, overrides, }: BuildProductsCollectionOptions) => CollectionConfig;

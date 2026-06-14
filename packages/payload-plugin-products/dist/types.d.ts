import type { CollectionConfig } from 'payload';
export type ProductsPluginConfig = {
    /**
     * Slug of the generated products collection.
     * @default 'products'
     */
    slug?: string;
    /**
     * Slug of the upload collection the `mockup` field relates to, and the one
     * the print-area editor fetches the mockup image (url + natural dimensions)
     * from.
     * @default 'media'
     */
    mediaCollectionSlug?: string;
    /**
     * Slug of the reusable physical-size print-templates collection.
     * @default 'print-templates'
     */
    printTemplatesSlug?: string;
    /**
     * Slug of the global color-swatches collection referenced by each product's
     * `colors` relationship and by each view's `colorMockups[].color` row.
     * @default 'color-swatches'
     */
    colorSwatchesSlug?: string;
    /**
     * Preset names offered in the Designer's "+ Add view" dropdown. Free-text
     * names are still accepted alongside.
     * @default ['Front', 'Back', 'Left', 'Right', 'Sleeve']
     */
    defaultViewPresets?: string[];
    /** Extra overrides merged onto the generated products collection config. */
    overrides?: Partial<CollectionConfig>;
    /** Disable the entire plugin (returns the config untouched). */
    disabled?: boolean;
};

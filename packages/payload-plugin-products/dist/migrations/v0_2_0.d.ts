import type { Payload } from 'payload';
export interface MigrateProductsV0_2Options {
    /** Display name for the seeded fallback color. Default `'Default'`. */
    defaultColorName?: string;
    /** Hex value for the seeded fallback color. Default `'#cccccc'`. */
    defaultColorHex?: string;
    /** Products collection slug. Default `'products'`. */
    productsSlug?: string;
    /** Color-swatches collection slug. Default `'color-swatches'`. */
    colorSwatchesSlug?: string;
}
export interface MigrateProductsV0_2Result {
    /** Number of products updated by this run. */
    migrated: number;
    /** Number of products already on the v0.2 shape (skipped). */
    skipped: number;
    /** ID of the seeded / reused fallback color-swatch. */
    defaultColorId: string;
}
/**
 * Migrate legacy v0.1.1 products into the v0.2.0 shape (one Front view, one
 * Default color). Idempotent: products already carrying a non-empty `views[]`
 * are skipped.
 *
 * The data migration relies on the legacy `products.mockup_id` and
 * `products.print_areas` columns still being present. The consumer must
 * hand-edit any auto-generated schema migration to defer their drop until
 * after this data migration has run — see the plugin README for the exact
 * procedure.
 */
export declare function migrateProductsV0_1ToV0_2(payload: Payload, options?: MigrateProductsV0_2Options): Promise<MigrateProductsV0_2Result>;

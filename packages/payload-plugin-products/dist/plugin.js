import { deepMergeSimple } from '@payloadcms/translations/utilities';
import { buildProductsCollection } from './collections/Products.js';
import { buildPrintTemplatesCollection } from './collections/PrintTemplates.js';
import { buildColorSwatchesCollection } from './collections/ColorSwatches.js';
import { productsTranslations } from './translations.js';
const DEFAULT_SLUG = 'products';
const DEFAULT_MEDIA_SLUG = 'media';
const DEFAULT_PRINT_TEMPLATES_SLUG = 'print-templates';
const DEFAULT_COLOR_SWATCHES_SLUG = 'color-swatches';
const DEFAULT_VIEW_PRESETS = [
    'Front',
    'Back',
    'Left',
    'Right',
    'Sleeve'
];
/**
 * Products plugin. Adds a `products` collection whose `printAreas` JSON field
 * renders through shadcn-admin's `.input` override as a Fabric.js canvas editor:
 * upload a mockup image (a sibling `upload` field) and lay out one or more
 * physically-sized, aspect-locked print areas on top of it (move / resize /
 * align).
 *
 * Depends on `payload-plugin-shadcn-admin` for the doc-form override surface and
 * UI. Register this BEFORE `shadcnAdminPlugin` so the collection exists when the
 * admin plugin installs its auto list/doc views over it (consumer-wins: skips if
 * the slug already exists).
 */ export const productsPlugin = (options = {})=>(config)=>{
        if (options.disabled) return config;
        const slug = options.slug ?? DEFAULT_SLUG;
        const mediaCollectionSlug = options.mediaCollectionSlug ?? DEFAULT_MEDIA_SLUG;
        const printTemplatesSlug = options.printTemplatesSlug ?? DEFAULT_PRINT_TEMPLATES_SLUG;
        const colorSwatchesSlug = options.colorSwatchesSlug ?? DEFAULT_COLOR_SWATCHES_SLUG;
        const defaultViewPresets = options.defaultViewPresets && options.defaultViewPresets.length > 0 ? options.defaultViewPresets : DEFAULT_VIEW_PRESETS;
        const next = {
            ...config,
            // Merge our admin-UI translations under the `pluginProducts` namespace.
            // Additive — nothing the app or another plugin defined is clobbered.
            i18n: {
                ...config.i18n,
                translations: deepMergeSimple(config.i18n?.translations ?? {}, productsTranslations)
            }
        };
        // Consumer-wins: skip each collection if a slug conflict exists.
        const existing = config.collections ?? [];
        const toAdd = [];
        if (!existing.some((c)=>c.slug === slug)) {
            toAdd.push(buildProductsCollection({
                slug,
                mediaCollectionSlug,
                printTemplatesSlug,
                colorSwatchesSlug,
                defaultViewPresets,
                overrides: options.overrides
            }));
        }
        if (!existing.some((c)=>c.slug === printTemplatesSlug)) {
            toAdd.push(buildPrintTemplatesCollection({
                slug: printTemplatesSlug
            }));
        }
        if (!existing.some((c)=>c.slug === colorSwatchesSlug)) {
            toAdd.push(buildColorSwatchesCollection({
                slug: colorSwatchesSlug,
                mediaCollectionSlug
            }));
        }
        if (toAdd.length > 0) {
            next.collections = [
                ...existing,
                ...toAdd
            ];
        }
        return next;
    };

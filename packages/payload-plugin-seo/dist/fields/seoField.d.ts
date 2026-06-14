import type { GroupField } from 'payload';
export type SeoFieldOptions = {
    /**
     * Field name (the group persists at this key).
     * @default 'meta'
     */
    name?: string;
    /**
     * Upload collection for the meta / OG image.
     * @default 'media'
     */
    uploadsCollection?: string;
    /**
     * Localize the text fields.
     * @default true
     */
    localized?: boolean;
    /**
     * Group heading. Pass `false` to hide it (e.g. when you drop the field into a
     * tab that already provides the heading).
     * @default 'SEO'
     */
    label?: string | false;
    /**
     * Add a read-only `jsonLdComputed` virtual field that assembles the `schema`
     * blocks into JSON-LD on read. Off by default (pure storage; the frontend can
     * call the exported `buildJsonLd` itself).
     * @default false
     */
    jsonLdVirtualField?: boolean;
};
/**
 * The SEO `meta` group as a standalone field, for manual placement. Drop it
 * anywhere in a collection/global config — inside a tab, row, or top level —
 * to control exactly where it renders, instead of letting the plugin
 * auto-inject it.
 *
 * @example
 * import { seoField } from 'payload-plugin-seo'
 *
 * export const Pages = {
 *   slug: 'pages',
 *   fields: [
 *     { type: 'tabs', tabs: [
 *       { label: 'Content', fields: [...] },
 *       { label: 'SEO', fields: [seoField({ label: false })] },
 *     ]},
 *   ],
 * }
 */
export declare const seoField: (options?: SeoFieldOptions) => GroupField;

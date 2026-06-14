import { buildMetaField } from './metaField.js';
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
 */ export const seoField = (options = {})=>buildMetaField({
        name: options.name ?? 'meta',
        uploadsCollection: options.uploadsCollection ?? 'media',
        localized: options.localized ?? true,
        label: options.label ?? 'SEO',
        jsonLdVirtualField: options.jsonLdVirtualField ?? false
    });

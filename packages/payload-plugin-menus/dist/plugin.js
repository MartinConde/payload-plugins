import { deepMergeSimple } from '@payloadcms/translations/utilities';
import { buildMenusCollection } from './collections/Menus.js';
import { menusTranslations } from './translations.js';
const DEFAULT_SLUG = 'menus';
const DEFAULT_LINKABLE = [
    'pages'
];
/**
 * Menu builder plugin. Adds a `menus` collection whose `tree` JSON field renders
 * through shadcn-admin's `.input` override as a dnd-kit nested-tree editor.
 * Items link to a document (from `linkableCollections`) or a custom URL, with a
 * label, open-in-new-tab toggle, and CSS class. An `afterRead` hook denormalizes
 * `{ url, label }` per linked item for the frontend.
 *
 * Depends on `payload-plugin-shadcn-admin` for the doc-form override surface and
 * UI. Register this BEFORE `shadcnAdminPlugin` so the collection exists when the
 * admin plugin installs its auto list/doc views over it (consumer-wins: skips if
 * the slug already exists).
 */ export const menusPlugin = (options = {})=>(config)=>{
        if (options.disabled) return config;
        const slug = options.slug ?? DEFAULT_SLUG;
        const linkableCollections = options.linkableCollections && options.linkableCollections.length > 0 ? options.linkableCollections : DEFAULT_LINKABLE;
        const localized = options.localized ?? true;
        const next = {
            ...config,
            // Merge our admin-UI translations under the `pluginMenus` namespace.
            // Additive — nothing the app or another plugin defined is clobbered.
            i18n: {
                ...config.i18n,
                translations: deepMergeSimple(config.i18n?.translations ?? {}, menusTranslations)
            }
        };
        // Consumer-wins: skip if a collection with this slug already exists.
        const existing = config.collections ?? [];
        if (!existing.some((c)=>c.slug === slug)) {
            next.collections = [
                ...existing,
                buildMenusCollection({
                    slug,
                    linkableCollections,
                    localized,
                    maxDepth: options.maxDepth,
                    resolveUrl: options.resolveUrl,
                    resolveOverrideAccess: options.resolveOverrideAccess,
                    overrides: options.overrides
                })
            ];
        }
        return next;
    };

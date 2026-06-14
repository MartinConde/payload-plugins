import { deepMergeSimple } from '@payloadcms/translations/utilities';
import { buildMetaField } from './fields/metaField.js';
import { buildSeoSettingsGlobal } from './fields/seoSettingsGlobal.js';
import { buildRedirectsCollection } from './fields/redirectsCollection.js';
import { seoTranslations } from './translations.js';
const DEFAULT_FIELD_NAME = 'meta';
const DEFAULT_UPLOADS_COLLECTION = 'media';
const DEFAULT_SETTINGS_SLUG = 'seo-settings';
const DEFAULT_REDIRECTS_SLUG = 'redirects';
/**
 * SEO plugin. Adds a per-document `meta` group (rendered by shadcn-admin's
 * group-level `.input` override → `SeoGroupInput`), a site-wide SEO defaults
 * global, and a redirects collection.
 *
 * Register this BEFORE `shadcnAdminPlugin` so the group/global/collection it
 * adds exist when the admin plugin installs its auto views over them.
 *
 * INTENTIONALLY CUSTOM — this is a deliberate in-house replacement for the
 * official `@payloadcms/plugin-seo` + `@payloadcms/plugin-redirects`, chosen
 * for the curated JSON-LD schema blocks and the shadcn-admin UI integration
 * (the `.input` overrides + wizard view). Do NOT co-register the official
 * plugins: this plugin's `meta` group and `redirects` collection would collide
 * with theirs (duplicate fields / slugs). Consumer-wins guards skip re-adding
 * an already-present slug/field, but they won't reconcile two competing shapes.
 */ export const seoPlugin = (options = {})=>(config)=>{
        if (options.disabled) return config;
        const fieldName = options.fieldName ?? DEFAULT_FIELD_NAME;
        const uploadsCollection = options.uploadsCollection ?? DEFAULT_UPLOADS_COLLECTION;
        const localized = options.localized ?? true;
        const jsonLdVirtualField = options.jsonLdVirtualField ?? false;
        const metaTargets = new Set(options.collections ?? []);
        const globalTargets = new Set(options.globals ?? []);
        const tabOption = options.tab ?? false;
        const tabLabel = typeof tabOption === 'object' && tabOption.label || 'SEO';
        // Consumer-wins guard: skip if the group already exists at the top level or
        // one level inside an existing tabs field (covers manual `seoField()` use).
        const hasMetaField = (fields = [])=>fields.some((f)=>{
                if ('name' in f && f.name === fieldName) return true;
                if (f.type === 'tabs') {
                    return f.tabs.some((t)=>('fields' in t ? t.fields : []).some((tf)=>'name' in tf && tf.name === fieldName));
                }
                return false;
            });
        // Returns a new fields array with the SEO group placed per the `tab` option:
        // appended to the bottom (default), or merged as an (unnamed) tab into the
        // existing top-level tabs field — created if there isn't one. The tab is
        // unnamed so the group still persists at `<fieldName>` (data shape unchanged).
        const placeMetaField = (fields)=>{
            if (!tabOption) {
                return [
                    ...fields,
                    buildMetaField({
                        name: fieldName,
                        uploadsCollection,
                        localized,
                        jsonLdVirtualField
                    })
                ];
            }
            // The tab supplies the heading, so hide the group's own label.
            const metaField = buildMetaField({
                name: fieldName,
                uploadsCollection,
                localized,
                label: false,
                jsonLdVirtualField
            });
            const seoTab = {
                label: tabLabel,
                fields: [
                    metaField
                ]
            };
            const tabsIdx = fields.findIndex((f)=>f.type === 'tabs');
            if (tabsIdx === -1) {
                return [
                    ...fields,
                    {
                        type: 'tabs',
                        tabs: [
                            seoTab
                        ]
                    }
                ];
            }
            return fields.map((f, i)=>i === tabsIdx && f.type === 'tabs' ? {
                    ...f,
                    tabs: [
                        ...f.tabs,
                        seoTab
                    ]
                } : f);
        };
        const next = {
            ...config,
            // Merge our field/preview translations under the `pluginSeo` namespace.
            // Additive — nothing the app or another plugin defined is clobbered.
            i18n: {
                ...config.i18n,
                translations: deepMergeSimple(config.i18n?.translations ?? {}, seoTranslations)
            }
        };
        // 1. Per-document SEO group on matching collections.
        if (metaTargets.size > 0) {
            next.collections = (config.collections ?? []).map((collection)=>metaTargets.has(collection.slug) && !hasMetaField(collection.fields) ? {
                    ...collection,
                    fields: placeMetaField(collection.fields)
                } : collection);
        }
        // ...and on matching globals.
        if (globalTargets.size > 0) {
            next.globals = (next.globals ?? config.globals ?? []).map((global)=>globalTargets.has(global.slug) && !hasMetaField(global.fields) ? {
                    ...global,
                    fields: placeMetaField(global.fields)
                } : global);
        }
        // 2. SEO defaults global (consumer-wins: skip if the slug already exists).
        const settings = options.settingsGlobal ?? true;
        if (settings !== false) {
            const slug = typeof settings === 'object' && settings.slug || DEFAULT_SETTINGS_SLUG;
            const existing = next.globals ?? config.globals ?? [];
            if (!existing.some((g)=>g.slug === slug)) {
                // Collections selectable in the per-collection meta-pattern picker: the
                // configured meta collections, else every collection in the config.
                const templateCollections = options.collections && options.collections.length > 0 ? options.collections : (next.collections ?? config.collections ?? []).map((c)=>c.slug);
                next.globals = [
                    ...existing,
                    buildSeoSettingsGlobal({
                        slug,
                        uploadsCollection,
                        templateCollections,
                        wizard: options.wizard ?? true
                    })
                ];
            }
        }
        // 3. Redirects collection (consumer-wins: skip if the slug already exists).
        const redirects = options.redirects ?? true;
        if (redirects !== false) {
            const slug = typeof redirects === 'object' && redirects.slug || DEFAULT_REDIRECTS_SLUG;
            const existing = next.collections ?? config.collections ?? [];
            if (!existing.some((c)=>c.slug === slug)) {
                // Default internal-target collections: the configured meta collections,
                // else every collection currently in the config.
                const targetCollections = typeof redirects === 'object' && redirects.collections || (options.collections && options.collections.length > 0 ? options.collections : existing.map((c)=>c.slug));
                next.collections = [
                    ...existing,
                    buildRedirectsCollection({
                        slug,
                        collections: targetCollections,
                        overrides: typeof redirects === 'object' ? redirects.overrides : undefined
                    })
                ];
            }
        }
        // 4. SEO setup wizard view at `/admin/seo-wizard`. The view is registered
        //    by string path (resolved via importMap), so it's never imported at
        //    config-load — that's why its client graph may use shadcn-admin's
        //    `/client` UI primitives without tripping the Node-safety/CSS crash the
        //    `SeoGroupInput` `.input` override must avoid. Options can't be passed
        //    to a string-path component, so the resolved slugs are stashed on
        //    `config.custom['plugin-seo']` for the RSC to read. Skip when the
        //    settings global it edits is disabled.
        const settingsEnabled = (options.settingsGlobal ?? true) !== false;
        if ((options.wizard ?? true) && settingsEnabled) {
            const settingsSlug = typeof options.settingsGlobal === 'object' && options.settingsGlobal.slug || DEFAULT_SETTINGS_SLUG;
            const redirectsSlug = typeof options.redirects === 'object' && options.redirects.slug || DEFAULT_REDIRECTS_SLUG;
            next.custom = {
                ...next.custom ?? {},
                'plugin-seo': {
                    settingsSlug,
                    uploadsCollection,
                    fieldName,
                    redirectsSlug
                }
            };
            next.admin = {
                ...next.admin,
                components: {
                    ...next.admin?.components,
                    views: {
                        ...next.admin?.components?.views,
                        seoWizard: {
                            Component: 'payload-plugin-seo/rsc#SeoWizardView',
                            path: '/seo-wizard'
                        }
                    }
                }
            };
        }
        return next;
    };

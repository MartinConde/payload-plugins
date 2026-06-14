import type { CollectionConfig } from 'payload';
export type SeoPluginConfig = {
    /** Collection slugs that get the per-document SEO `meta` group. */
    collections?: string[];
    /** Global slugs that get the per-document SEO `meta` group. */
    globals?: string[];
    /**
     * Upload collection used for meta / Open Graph images.
     * @default 'media'
     */
    uploadsCollection?: string;
    /**
     * Name of the injected SEO group field.
     * @default 'meta'
     */
    fieldName?: string;
    /**
     * Place the injected SEO group inside a tab instead of appending it to the
     * bottom of the fields. When the collection/global already has a top-level
     * `tabs` field, an SEO tab is merged into it; otherwise a new `tabs` field is
     * created. The tab is unnamed, so the group still persists at its field name
     * (data shape unchanged). Pass an object to set the tab label.
     *
     * For full control over placement, skip this and use the exported
     * `seoField()` helper directly in your own collection config instead.
     * @default false
     */
    tab?: boolean | {
        label?: string;
    };
    /**
     * Make the injected SEO text fields localized. Only takes effect when the
     * Payload config has `localization` configured.
     * @default true
     */
    localized?: boolean;
    /**
     * Add a read-only `meta.jsonLdComputed` virtual field that assembles the
     * structured-data `schema` blocks into JSON-LD on read (via `buildJsonLd`).
     * Off by default — the plugin's baseline is pure storage and the frontend can
     * call the exported `buildJsonLd` itself. Turn on if you'd rather read
     * pre-assembled JSON-LD straight from the API. Never shown in the admin form.
     * @default false
     */
    jsonLdVirtualField?: boolean;
    /**
     * Register the site-wide SEO defaults global (`seo-settings`). Pass an object
     * to rename the slug. Set `false` to skip.
     * @default true
     */
    settingsGlobal?: boolean | {
        slug?: string;
    };
    /**
     * Register the redirects collection. Pass an object to rename the slug or
     * restrict the internal-target collections. Set `false` to skip.
     * @default true
     */
    redirects?: boolean | {
        slug?: string;
        /** Collections selectable as internal redirect targets. */
        collections?: string[];
        /** Extra overrides merged onto the generated collection config. */
        overrides?: Partial<CollectionConfig>;
    };
    /**
     * Register the SEO setup wizard — a guided, Yoast-style admin view at
     * `/admin/seo-wizard` that walks through the `seo-settings` essentials and
     * shows a live completeness/health panel. Add a nav link to it yourself
     * (the link's placement is owned by your admin nav). Set `false` to skip.
     * @default true
     */
    wizard?: boolean;
    /** Disable the entire plugin (returns the config untouched). */
    disabled?: boolean;
};

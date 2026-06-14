import type { GlobalConfig } from 'payload';
export type BuildSeoSettingsOptions = {
    slug: string;
    uploadsCollection: string;
    /** Collection slugs selectable in the per-collection meta-pattern picker. */
    templateCollections: string[];
    /** When true, prepend a launch card for the SEO setup wizard. */
    wizard?: boolean;
};
/** Common `og:locale` codes (language_TERRITORY). Rendered as a searchable
 *  combobox by shadcn-admin since the list is long. */
export declare const OG_LOCALE_OPTIONS: {
    label: string;
    value: string;
}[];
/**
 * Site-wide SEO defaults (broad v1 scope). Stores values only — frontends read
 * the global and apply them (e.g. concatenate `titleTemplate` with a page's
 * meta title). No server-side hooks or virtual fields.
 *
 * UI note: this global renders through NATIVE Payload field rendering (unlike
 * the per-document `meta` panel, which is owned by the shadcn-admin group
 * `.input` override `SeoGroupInput`). To organize it we use a top-level `tabs`
 * field with UNNAMED tabs — unnamed so every field stays at the global's root
 * (`titleTemplate`, `defaultNoindex`, `organization.*`, `sitemap.*` …). Named
 * tabs would nest every leaf and change the data shape; these don't, so the
 * generated types and frontend reads are unaffected. Sectioning within tabs
 * uses transparent `row` containers + `admin.description` text for guidance;
 * the `organization`/`sitemap` named groups render as bordered, headed cards
 * (`GroupSection`), matching the doc panel's `og`/`twitter`.
 */
export declare const buildSeoSettingsGlobal: ({ slug, uploadsCollection, templateCollections, wizard, }: BuildSeoSettingsOptions) => GlobalConfig;

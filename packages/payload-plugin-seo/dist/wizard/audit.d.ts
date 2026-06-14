import type { SeoTranslationsKeys } from '../translations.js';
export type CheckStatus = 'ok' | 'warn' | 'missing';
export type ChecklistItem = {
    id: string;
    labelKey: SeoTranslationsKeys;
    status: CheckStatus;
};
/** Per-collection completeness row, computed in the RSC and passed to the
 *  client. `missing` counts docs lacking a meta title OR description (default
 *  locale only — see SeoWizardView). */
export type CollectionHealth = {
    slug: string;
    label: string;
    total: number;
    missing: number;
};
/** The subset of `seo-settings` global fields the checklist inspects. Localized
 *  text fields arrive already resolved to one locale (default) as plain
 *  strings; uploads arrive as an id (depth 0) or a populated object. */
export type SeoSettingsData = {
    titleTemplate?: string | null;
    defaultDescription?: string | null;
    defaultOgImage?: number | string | {
        id?: number | string;
    } | null;
    organization?: {
        name?: string | null;
        url?: string | null;
        sameAs?: {
            url?: string | null;
        }[] | null;
    } | null;
    sitemap?: {
        changefreq?: string | null;
        priority?: number | null;
    } | null;
};
/** Score the site-wide settings into a checklist. Pure — same input, same
 *  output — so it can run on the server or client. */
export declare function computeSettingsChecklist(data: SeoSettingsData | null | undefined): ChecklistItem[];
/** Weighted completion percentage (ok = 1, warn = 0.5, missing = 0). */
export declare function completionPercent(items: ChecklistItem[]): number;

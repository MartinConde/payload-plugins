import type { SeoTranslationsKeys } from '../translations.js';
export type CheckStatus = 'ok' | 'warn' | 'missing';
/** Ideal meta lengths. Single-sourced here so the per-field counters in
 *  `SeoGroupInput` and the wizard's site-wide roll-up can't drift apart. */
export declare const TITLE_IDEAL = 60;
export declare const DESC_IDEAL = 160;
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
/** A document that carries a duplicated meta value. */
export type DuplicateDoc = {
    collection: string;
    id: string | number;
    label: string;
};
/** One row of the wizard's meta sweep — the two strings we compare, plus enough
 *  identity to link back into the admin. Gathered in `SeoWizardView` (it needs
 *  `payload`) and only grouped here. */
export type AuditRow = DuplicateDoc & {
    title: string;
    description: string;
};
export type DuplicateField = 'title' | 'description';
/** A meta value shared by two or more documents. `count` is the real number of
 *  documents; `docs` is capped for display. */
export type DuplicateGroup = {
    field: DuplicateField;
    value: string;
    count: number;
    docs: DuplicateDoc[];
};
/** Result of the sweep. `scanned`/`total`/`failedCollections` exist so the UI
 *  can say what it did NOT look at: a capped sweep produces false negatives
 *  only — it can miss a duplicate, it can never invent one. */
export type DuplicateReport = {
    groups: DuplicateGroup[];
    hiddenGroups: number;
    longTitles: number;
    longDescriptions: number;
    scanned: number;
    total: number;
    truncated: boolean;
    failedCollections: number;
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
/** Group swept rows into duplicate title/description sets and count over-length
 *  values. Pure — Payload has no group-by, so the sweep pages rows out of the
 *  database and the grouping happens here.
 *
 *  Empty values are deliberately NOT grouped: they are already reported by the
 *  per-collection missing-meta panel, and counting them here would report the
 *  same documents twice under two different problems. Note this treats a
 *  whitespace-only value as empty, which is wider than that panel's
 *  `exists: false` — see the SEO plugin docs. */
export declare function buildDuplicateReport(rows: AuditRow[], meta: {
    scanned: number;
    total: number;
    failedCollections: number;
}): DuplicateReport;

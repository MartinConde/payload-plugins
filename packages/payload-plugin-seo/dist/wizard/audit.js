/* Node-safe pure helpers for the SEO setup wizard's health panel.

   Imports only types — no `@payloadcms/ui`, no value imports — so this module
   is safe to pull into both the RSC view and the client component. The
   site-wide settings checklist is a pure function of the `seo-settings` global
   data; per-collection completeness counts are gathered server-side in
   `SeoWizardView` (they need `payload`) and only shaped/typed here. */ /** Ideal meta lengths. Single-sourced here so the per-field counters in
 *  `SeoGroupInput` and the wizard's site-wide roll-up can't drift apart. */ export const TITLE_IDEAL = 60;
export const DESC_IDEAL = 160;
/** Display ceilings for the duplicates panel — the counts they hide are
 *  reported alongside them, never swallowed. */ const MAX_DUPLICATE_GROUPS = 10;
const MAX_DUPLICATE_DOCS_PER_GROUP = 5;
const filled = (v)=>typeof v === 'string' ? v.trim().length > 0 : v != null && v !== '';
/** Score the site-wide settings into a checklist. Pure — same input, same
 *  output — so it can run on the server or client. */ export function computeSettingsChecklist(data) {
    const d = data ?? {};
    const title = typeof d.titleTemplate === 'string' ? d.titleTemplate.trim() : '';
    const titleStatus = title.length === 0 ? 'missing' : title === '%s' ? 'warn' : 'ok';
    const orgName = filled(d.organization?.name);
    const orgUrl = filled(d.organization?.url);
    const orgStatus = orgName && orgUrl ? 'ok' : orgName || orgUrl ? 'warn' : 'missing';
    const socialCount = (d.organization?.sameAs ?? []).filter((s)=>filled(s?.url)).length;
    const sitemapStatus = filled(d.sitemap?.changefreq) ? 'ok' : 'missing';
    return [
        {
            id: 'titleTemplate',
            labelKey: 'pluginSeo:checkTitleTemplate',
            status: titleStatus
        },
        {
            id: 'defaultDescription',
            labelKey: 'pluginSeo:checkDefaultDescription',
            status: filled(d.defaultDescription) ? 'ok' : 'missing'
        },
        {
            id: 'ogImage',
            labelKey: 'pluginSeo:checkOgImage',
            status: filled(d.defaultOgImage) ? 'ok' : 'missing'
        },
        {
            id: 'organization',
            labelKey: 'pluginSeo:checkOrganization',
            status: orgStatus
        },
        {
            id: 'socialProfiles',
            labelKey: 'pluginSeo:checkSocialProfiles',
            status: socialCount > 0 ? 'ok' : 'missing'
        },
        {
            id: 'sitemap',
            labelKey: 'pluginSeo:checkSitemap',
            status: sitemapStatus
        }
    ];
}
/** Weighted completion percentage (ok = 1, warn = 0.5, missing = 0). */ export function completionPercent(items) {
    if (items.length === 0) return 0;
    const score = items.reduce((sum, i)=>sum + (i.status === 'ok' ? 1 : i.status === 'warn' ? 0.5 : 0), 0);
    return Math.round(score / items.length * 100);
}
/** Comparison key for two meta strings: trimmed, internal whitespace collapsed,
 *  lowercased. "Welcome  Home " and "welcome home" are the same title as far as
 *  a SERP is concerned. */ const normalize = (v)=>v.trim().replace(/\s+/g, ' ').toLowerCase();
/** Group swept rows into duplicate title/description sets and count over-length
 *  values. Pure — Payload has no group-by, so the sweep pages rows out of the
 *  database and the grouping happens here.
 *
 *  Empty values are deliberately NOT grouped: they are already reported by the
 *  per-collection missing-meta panel, and counting them here would report the
 *  same documents twice under two different problems. Note this treats a
 *  whitespace-only value as empty, which is wider than that panel's
 *  `exists: false` — see the SEO plugin docs. */ export function buildDuplicateReport(rows, meta) {
    const byKey = new Map();
    const collect = (field, raw, doc)=>{
        const key = normalize(raw);
        if (key.length === 0) return;
        const group = byKey.get(`${field} ${key}`);
        if (!group) {
            byKey.set(`${field} ${key}`, {
                field,
                value: raw.trim(),
                count: 1,
                docs: [
                    doc
                ]
            });
            return;
        }
        group.count += 1;
        if (group.docs.length < MAX_DUPLICATE_DOCS_PER_GROUP) group.docs.push(doc);
    };
    let longTitles = 0;
    let longDescriptions = 0;
    for (const row of rows){
        const doc = {
            collection: row.collection,
            id: row.id,
            label: row.label
        };
        collect('title', row.title, doc);
        collect('description', row.description, doc);
        if (row.title.trim().length > TITLE_IDEAL) longTitles += 1;
        if (row.description.trim().length > DESC_IDEAL) longDescriptions += 1;
    }
    // Worst first; ties broken on the value itself so the order is deterministic
    // across renders (no locale-sensitive localeCompare).
    const duplicates = [
        ...byKey.values()
    ].filter((g)=>g.count > 1).sort((a, b)=>b.count !== a.count ? b.count - a.count : a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
    return {
        groups: duplicates.slice(0, MAX_DUPLICATE_GROUPS),
        hiddenGroups: Math.max(0, duplicates.length - MAX_DUPLICATE_GROUPS),
        longTitles,
        longDescriptions,
        scanned: meta.scanned,
        total: meta.total,
        truncated: meta.scanned < meta.total,
        failedCollections: meta.failedCollections
    };
}

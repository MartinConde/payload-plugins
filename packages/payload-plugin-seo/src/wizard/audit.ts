/* Node-safe pure helpers for the SEO setup wizard's health panel.

   Imports only types — no `@payloadcms/ui`, no value imports — so this module
   is safe to pull into both the RSC view and the client component. The
   site-wide settings checklist is a pure function of the `seo-settings` global
   data; per-collection completeness counts are gathered server-side in
   `SeoWizardView` (they need `payload`) and only shaped/typed here. */

import type { SeoTranslationsKeys } from '../translations.js'

export type CheckStatus = 'ok' | 'warn' | 'missing'

/** Ideal meta lengths. Single-sourced here so the per-field counters in
 *  `SeoGroupInput` and the wizard's site-wide roll-up can't drift apart. */
export const TITLE_IDEAL = 60
export const DESC_IDEAL = 160

/** Display ceilings for the duplicates panel — the counts they hide are
 *  reported alongside them, never swallowed. */
const MAX_DUPLICATE_GROUPS = 10
const MAX_DUPLICATE_DOCS_PER_GROUP = 5

export type ChecklistItem = {
  id: string
  labelKey: SeoTranslationsKeys
  status: CheckStatus
}

/** Per-collection completeness row, computed in the RSC and passed to the
 *  client. `missing` counts docs lacking a meta title OR description (default
 *  locale only — see SeoWizardView). */
export type CollectionHealth = {
  slug: string
  label: string
  total: number
  missing: number
}

/** A document that carries a duplicated meta value. */
export type DuplicateDoc = {
  collection: string
  id: string | number
  label: string
}

/** One row of the wizard's meta sweep — the two strings we compare, plus enough
 *  identity to link back into the admin. Gathered in `SeoWizardView` (it needs
 *  `payload`) and only grouped here. */
export type AuditRow = DuplicateDoc & {
  title: string
  description: string
}

export type DuplicateField = 'title' | 'description'

/** A meta value shared by two or more documents. `count` is the real number of
 *  documents; `docs` is capped for display. */
export type DuplicateGroup = {
  field: DuplicateField
  value: string
  count: number
  docs: DuplicateDoc[]
}

/** Result of the sweep. `scanned`/`total`/`failedCollections` exist so the UI
 *  can say what it did NOT look at: a capped sweep produces false negatives
 *  only — it can miss a duplicate, it can never invent one. */
export type DuplicateReport = {
  groups: DuplicateGroup[]
  hiddenGroups: number
  longTitles: number
  longDescriptions: number
  scanned: number
  total: number
  truncated: boolean
  failedCollections: number
}

/** The subset of `seo-settings` global fields the checklist inspects. Localized
 *  text fields arrive already resolved to one locale (default) as plain
 *  strings; uploads arrive as an id (depth 0) or a populated object. */
export type SeoSettingsData = {
  titleTemplate?: string | null
  defaultDescription?: string | null
  defaultOgImage?: number | string | { id?: number | string } | null
  organization?: {
    name?: string | null
    url?: string | null
    sameAs?: { url?: string | null }[] | null
  } | null
  sitemap?: {
    changefreq?: string | null
    priority?: number | null
  } | null
}

const filled = (v: unknown): boolean =>
  typeof v === 'string' ? v.trim().length > 0 : v != null && v !== ''

/** Score the site-wide settings into a checklist. Pure — same input, same
 *  output — so it can run on the server or client. */
export function computeSettingsChecklist(
  data: SeoSettingsData | null | undefined,
): ChecklistItem[] {
  const d = data ?? {}

  const title = typeof d.titleTemplate === 'string' ? d.titleTemplate.trim() : ''
  const titleStatus: CheckStatus =
    title.length === 0 ? 'missing' : title === '%s' ? 'warn' : 'ok'

  const orgName = filled(d.organization?.name)
  const orgUrl = filled(d.organization?.url)
  const orgStatus: CheckStatus =
    orgName && orgUrl ? 'ok' : orgName || orgUrl ? 'warn' : 'missing'

  const socialCount = (d.organization?.sameAs ?? []).filter((s) =>
    filled(s?.url),
  ).length

  const sitemapStatus: CheckStatus = filled(d.sitemap?.changefreq)
    ? 'ok'
    : 'missing'

  return [
    {
      id: 'titleTemplate',
      labelKey: 'pluginSeo:checkTitleTemplate',
      status: titleStatus,
    },
    {
      id: 'defaultDescription',
      labelKey: 'pluginSeo:checkDefaultDescription',
      status: filled(d.defaultDescription) ? 'ok' : 'missing',
    },
    {
      id: 'ogImage',
      labelKey: 'pluginSeo:checkOgImage',
      status: filled(d.defaultOgImage) ? 'ok' : 'missing',
    },
    {
      id: 'organization',
      labelKey: 'pluginSeo:checkOrganization',
      status: orgStatus,
    },
    {
      id: 'socialProfiles',
      labelKey: 'pluginSeo:checkSocialProfiles',
      status: socialCount > 0 ? 'ok' : 'missing',
    },
    { id: 'sitemap', labelKey: 'pluginSeo:checkSitemap', status: sitemapStatus },
  ]
}

/** Weighted completion percentage (ok = 1, warn = 0.5, missing = 0). */
export function completionPercent(items: ChecklistItem[]): number {
  if (items.length === 0) return 0
  const score = items.reduce(
    (sum, i) => sum + (i.status === 'ok' ? 1 : i.status === 'warn' ? 0.5 : 0),
    0,
  )
  return Math.round((score / items.length) * 100)
}

/** Comparison key for two meta strings: trimmed, internal whitespace collapsed,
 *  lowercased. "Welcome  Home " and "welcome home" are the same title as far as
 *  a SERP is concerned. */
const normalize = (v: string): string =>
  v.trim().replace(/\s+/g, ' ').toLowerCase()

/** Group swept rows into duplicate title/description sets and count over-length
 *  values. Pure — Payload has no group-by, so the sweep pages rows out of the
 *  database and the grouping happens here.
 *
 *  Empty values are deliberately NOT grouped: they are already reported by the
 *  per-collection missing-meta panel, and counting them here would report the
 *  same documents twice under two different problems. Note this treats a
 *  whitespace-only value as empty, which is wider than that panel's
 *  `exists: false` — see the SEO plugin docs. */
export function buildDuplicateReport(
  rows: AuditRow[],
  meta: { scanned: number; total: number; failedCollections: number },
): DuplicateReport {
  const byKey = new Map<string, DuplicateGroup>()

  const collect = (
    field: DuplicateField,
    raw: string,
    doc: DuplicateDoc,
  ): void => {
    const key = normalize(raw)
    if (key.length === 0) return
    const group = byKey.get(`${field} ${key}`)
    if (!group) {
      byKey.set(`${field} ${key}`, { field, value: raw.trim(), count: 1, docs: [doc] })
      return
    }
    group.count += 1
    if (group.docs.length < MAX_DUPLICATE_DOCS_PER_GROUP) group.docs.push(doc)
  }

  let longTitles = 0
  let longDescriptions = 0

  for (const row of rows) {
    const doc: DuplicateDoc = {
      collection: row.collection,
      id: row.id,
      label: row.label,
    }
    collect('title', row.title, doc)
    collect('description', row.description, doc)
    if (row.title.trim().length > TITLE_IDEAL) longTitles += 1
    if (row.description.trim().length > DESC_IDEAL) longDescriptions += 1
  }

  // Worst first; ties broken on the value itself so the order is deterministic
  // across renders (no locale-sensitive localeCompare).
  const duplicates = [...byKey.values()]
    .filter((g) => g.count > 1)
    .sort((a, b) =>
      b.count !== a.count ? b.count - a.count : a.value < b.value ? -1 : a.value > b.value ? 1 : 0,
    )

  return {
    groups: duplicates.slice(0, MAX_DUPLICATE_GROUPS),
    hiddenGroups: Math.max(0, duplicates.length - MAX_DUPLICATE_GROUPS),
    longTitles,
    longDescriptions,
    scanned: meta.scanned,
    total: meta.total,
    truncated: meta.scanned < meta.total,
    failedCollections: meta.failedCollections,
  }
}

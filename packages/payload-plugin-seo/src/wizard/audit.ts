/* Node-safe pure helpers for the SEO setup wizard's health panel.

   Imports only types — no `@payloadcms/ui`, no value imports — so this module
   is safe to pull into both the RSC view and the client component. The
   site-wide settings checklist is a pure function of the `seo-settings` global
   data; per-collection completeness counts are gathered server-side in
   `SeoWizardView` (they need `payload`) and only shaped/typed here. */

import type { SeoTranslationsKeys } from '../translations.js'

export type CheckStatus = 'ok' | 'warn' | 'missing'

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

import type { Field, GlobalConfig } from 'payload'

import { seoStatic, seoT } from '../translations.js'
import { SeoWizardLaunch } from '../ui/SeoWizardLaunch.js'

export type BuildSeoSettingsOptions = {
  slug: string
  uploadsCollection: string
  /** Collection slugs selectable in the per-collection meta-pattern picker. */
  templateCollections: string[]
  /** When true, prepend a launch card for the SEO setup wizard. */
  wizard?: boolean
}

/* Presentational launch card for the setup wizard. A `ui` field (Payload's
   "vessel for a custom component") carrying shadcn-admin's `.input` override —
   so it stores no data and never appears in the generated types. */
const wizardLauncherField: Field = {
  name: 'seoWizardLauncher',
  type: 'ui',
  admin: {},
  custom: { 'plugin-shadcn-admin': { input: SeoWizardLaunch } },
}

/** Common `og:locale` codes (language_TERRITORY). Rendered as a searchable
 *  combobox by shadcn-admin since the list is long. */
export const OG_LOCALE_OPTIONS = [
  { label: 'English (US) — en_US', value: 'en_US' },
  { label: 'English (UK) — en_GB', value: 'en_GB' },
  { label: 'German — de_DE', value: 'de_DE' },
  { label: 'French — fr_FR', value: 'fr_FR' },
  { label: 'Spanish (Spain) — es_ES', value: 'es_ES' },
  { label: 'Spanish (Latin America) — es_419', value: 'es_419' },
  { label: 'Italian — it_IT', value: 'it_IT' },
  { label: 'Dutch — nl_NL', value: 'nl_NL' },
  { label: 'Portuguese (Brazil) — pt_BR', value: 'pt_BR' },
  { label: 'Portuguese (Portugal) — pt_PT', value: 'pt_PT' },
  { label: 'Polish — pl_PL', value: 'pl_PL' },
  { label: 'Swedish — sv_SE', value: 'sv_SE' },
  { label: 'Danish — da_DK', value: 'da_DK' },
  { label: 'Norwegian — nb_NO', value: 'nb_NO' },
  { label: 'Finnish — fi_FI', value: 'fi_FI' },
  { label: 'Czech — cs_CZ', value: 'cs_CZ' },
  { label: 'Russian — ru_RU', value: 'ru_RU' },
  { label: 'Turkish — tr_TR', value: 'tr_TR' },
  { label: 'Arabic — ar_AR', value: 'ar_AR' },
  { label: 'Hebrew — he_IL', value: 'he_IL' },
  { label: 'Japanese — ja_JP', value: 'ja_JP' },
  { label: 'Korean — ko_KR', value: 'ko_KR' },
  { label: 'Chinese (Simplified) — zh_CN', value: 'zh_CN' },
  { label: 'Chinese (Traditional) — zh_TW', value: 'zh_TW' },
  { label: 'Hindi — hi_IN', value: 'hi_IN' },
]

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
export const buildSeoSettingsGlobal = ({
  slug,
  uploadsCollection,
  templateCollections,
  wizard = true,
}: BuildSeoSettingsOptions): GlobalConfig => ({
  slug,
  // Entity-level global label/description must be locale-keyed OBJECTS, not
  // functions: Payload's global client-config builder serializes these raw to
  // the client (it does not resolve function forms for globals — unlike
  // collections/fields). See `seoStatic` in ../translations.
  label: seoStatic('pluginSeo:settingsLabel'),
  access: { read: () => true },
  admin: { description: seoStatic('pluginSeo:settingsDesc') },
  fields: [
    ...(wizard ? [wizardLauncherField] : []),
    {
      type: 'tabs',
      tabs: [
        {
          // Unnamed tab — fields persist at the global root (no data path).
          label: seoT('pluginSeo:tabDefaults'),
          description: seoT('pluginSeo:tabDefaultsDesc'),
          fields: [
            {
              name: 'titleTemplate',
              type: 'text',
              defaultValue: '%s',
              label: seoT('pluginSeo:titleTemplateLabel'),
              admin: {
                description: seoT('pluginSeo:titleTemplateDesc'),
              },
            },
            {
              name: 'defaultDescription',
              type: 'textarea',
              localized: true,
              label: seoT('pluginSeo:defaultDescriptionLabel'),
              admin: {
                description: seoT('pluginSeo:defaultDescriptionDesc'),
              },
            },
            {
              name: 'defaultOgImage',
              type: 'upload',
              relationTo: uploadsCollection,
              label: seoT('pluginSeo:defaultOgImageLabel'),
              admin: {
                description: seoT('pluginSeo:defaultOgImageDesc'),
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'defaultTwitterCard',
                  type: 'select',
                  defaultValue: 'summary_large_image',
                  label: seoT('pluginSeo:defaultTwitterCardLabel'),
                  admin: { description: seoT('pluginSeo:defaultTwitterCardDesc') },
                  options: [
                    { label: seoT('pluginSeo:twitterCardSummary'), value: 'summary' },
                    {
                      label: seoT('pluginSeo:twitterCardSummaryLarge'),
                      value: 'summary_large_image',
                    },
                  ],
                },
                {
                  name: 'defaultLocale',
                  type: 'select',
                  label: seoT('pluginSeo:defaultLocaleLabel'),
                  admin: {
                    description: seoT('pluginSeo:defaultLocaleDesc'),
                  },
                  options: OG_LOCALE_OPTIONS,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'defaultNoindex',
                  type: 'checkbox',
                  label: seoT('pluginSeo:noindex'),
                },
                {
                  name: 'defaultNofollow',
                  type: 'checkbox',
                  label: seoT('pluginSeo:nofollow'),
                },
              ],
            },
          ],
        },
        {
          label: seoT('pluginSeo:tabTemplates'),
          description: seoT('pluginSeo:tabTemplatesDesc'),
          fields: [
            {
              name: 'collectionTemplates',
              type: 'array',
              label: seoT('pluginSeo:collectionTemplatesLabel'),
              admin: {
                description: seoT('pluginSeo:collectionTemplatesDesc'),
              },
              fields: [
                // Select of the app's collection slugs when known; falls back
                // to a free-text input if no collections were resolved.
                templateCollections.length > 0
                  ? {
                      name: 'collection',
                      type: 'select',
                      required: true,
                      label: seoT('pluginSeo:templateCollectionLabel'),
                      admin: {
                        description: seoT('pluginSeo:templateCollectionDesc'),
                      },
                      options: templateCollections.map((s) => ({
                        label: s,
                        value: s,
                      })),
                    }
                  : {
                      name: 'collection',
                      type: 'text',
                      required: true,
                      label: seoT('pluginSeo:templateCollectionLabel'),
                      admin: {
                        description: seoT('pluginSeo:templateCollectionDesc'),
                      },
                    },
                {
                  name: 'titleTemplate',
                  type: 'text',
                  label: seoT('pluginSeo:patternTitleLabel'),
                  admin: {
                    description: seoT('pluginSeo:templateTokensDesc'),
                  },
                },
                {
                  name: 'descriptionTemplate',
                  type: 'textarea',
                  label: seoT('pluginSeo:patternDescriptionLabel'),
                  admin: {
                    description: seoT('pluginSeo:templateTokensDesc'),
                  },
                },
              ],
            },
          ],
        },
        {
          label: seoT('pluginSeo:tabOrganization'),
          description: seoT('pluginSeo:tabOrganizationDesc'),
          fields: [
            {
              name: 'organization',
              type: 'group',
              label: seoT('pluginSeo:organizationLabel'),
              admin: {
                description: seoT('pluginSeo:organizationDesc'),
              },
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  label: seoT('pluginSeo:orgNameLabel'),
                },
                {
                  name: 'url',
                  type: 'text',
                  label: seoT('pluginSeo:labelUrl'),
                },
                {
                  name: 'logo',
                  type: 'upload',
                  relationTo: uploadsCollection,
                  label: seoT('pluginSeo:orgLogoLabel'),
                },
                {
                  name: 'sameAs',
                  type: 'array',
                  label: seoT('pluginSeo:sameAsLabel'),
                  fields: [{ name: 'url', type: 'text', required: true }],
                },
              ],
            },
          ],
        },
        {
          label: seoT('pluginSeo:tabSitemap'),
          description: seoT('pluginSeo:tabSitemapDesc'),
          fields: [
            {
              name: 'sitemap',
              type: 'group',
              label: seoT('pluginSeo:sitemapLabel'),
              fields: [
                {
                  name: 'changefreq',
                  type: 'select',
                  label: seoT('pluginSeo:changefreqLabel'),
                  options: [
                    { label: seoT('pluginSeo:cfAlways'), value: 'always' },
                    { label: seoT('pluginSeo:cfHourly'), value: 'hourly' },
                    { label: seoT('pluginSeo:cfDaily'), value: 'daily' },
                    { label: seoT('pluginSeo:cfWeekly'), value: 'weekly' },
                    { label: seoT('pluginSeo:cfMonthly'), value: 'monthly' },
                    { label: seoT('pluginSeo:cfYearly'), value: 'yearly' },
                    { label: seoT('pluginSeo:cfNever'), value: 'never' },
                  ],
                },
                {
                  name: 'priority',
                  type: 'number',
                  min: 0,
                  max: 1,
                  label: seoT('pluginSeo:priorityLabel'),
                  admin: {
                    step: 0.1,
                    description: seoT('pluginSeo:priorityDesc'),
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

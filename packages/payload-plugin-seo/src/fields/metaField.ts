import type { GroupField } from 'payload'

import { SeoGroupInput } from '../ui/SeoGroupInput.js'
import { seoT } from '../translations.js'
import { buildSchemaBlocksField } from './schemaBlocks.js'
import { buildJsonLd, type SchemaBlock } from '../schema/buildJsonLd.js'

export type BuildMetaFieldOptions = {
  name: string
  uploadsCollection: string
  localized: boolean
  /** Group heading. Pass `false` to hide it (e.g. when the group lives in a
   *  tab that already supplies the heading). */
  label?: string | false
  /**
   * Add a read-only `jsonLdComputed` virtual field that assembles the `schema`
   * blocks into JSON-LD on read (via `buildJsonLd`). Off by default — the
   * plugin's baseline is pure storage; the frontend can call `buildJsonLd`
   * itself. When on, consumers can read pre-assembled JSON-LD straight from the
   * API. It is never shown in the admin form (kept out of `SeoGroupInput`).
   * @default false
   */
  jsonLdVirtualField?: boolean
}

/**
 * Builds the per-document SEO `meta` group. The group carries the
 * shadcn-admin `.input` override so the whole group renders through
 * `SeoGroupInput` (SERP/social preview + char counters) while the real
 * subfield inputs are delegated back to the host form via `renderChild` —
 * preserving localization, the OG image as a real upload relationship,
 * generated types, and queryability.
 *
 * Structure: the field tree is a FLAT list of leaves plus the two real named
 * groups (`og` / `twitter`). Sectioning (Basics → Robots & canonical → Social →
 * Advanced) is owned entirely by `SeoGroupInput`, which composes these subfields
 * by name into its own styled, Node-safe sections. The previous `collapsible` /
 * `row` wrappers were transparent containers, so dropping them does NOT move any
 * data path: `noindex`, `nofollow`, `canonicalUrl`, `jsonLd`, and the
 * `og.*` / `twitter.*` leaves all still persist at the exact same `meta.<…>`
 * paths — the data shape and generated types are unchanged.
 */
export const buildMetaField = ({
  name,
  uploadsCollection,
  localized,
  label = 'SEO',
  jsonLdVirtualField = false,
}: BuildMetaFieldOptions): GroupField => ({
  name,
  type: 'group',
  label,
  custom: {
    // Direct client-component reference (NOT a string path) — mirrors the
    // verified `.cell` override pattern. shadcn-admin's FieldInput renders this
    // as `<Override {...props} />`; 'use client' makes it a client reference
    // that survives the RSC→client boundary.
    'plugin-shadcn-admin': { input: SeoGroupInput },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized,
      label: seoT('pluginSeo:labelTitle'),
      admin: { description: seoT('pluginSeo:metaTitleDesc') },
    },
    {
      name: 'description',
      type: 'textarea',
      localized,
      label: seoT('pluginSeo:labelDescription'),
      admin: { description: seoT('pluginSeo:metaDescriptionDesc') },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: uploadsCollection,
      label: seoT('pluginSeo:labelImage'),
      admin: { description: seoT('pluginSeo:imageDesc') },
    },
    { name: 'noindex', type: 'checkbox', label: seoT('pluginSeo:noindex') },
    { name: 'nofollow', type: 'checkbox', label: seoT('pluginSeo:nofollow') },
    {
      name: 'canonicalUrl',
      type: 'text',
      label: seoT('pluginSeo:canonicalUrl'),
      admin: { description: seoT('pluginSeo:canonicalUrlDesc') },
    },
    {
      name: 'og',
      type: 'group',
      label: 'Open Graph',
      fields: [
        {
          name: 'title',
          type: 'text',
          localized,
          label: seoT('pluginSeo:labelTitle'),
        },
        {
          name: 'description',
          type: 'textarea',
          localized,
          label: seoT('pluginSeo:labelDescription'),
        },
        {
          name: 'type',
          type: 'select',
          defaultValue: 'website',
          label: seoT('pluginSeo:labelType'),
          options: [
            { label: seoT('pluginSeo:ogTypeWebsite'), value: 'website' },
            { label: seoT('pluginSeo:ogTypeArticle'), value: 'article' },
            { label: seoT('pluginSeo:ogTypeProfile'), value: 'profile' },
          ],
        },
      ],
    },
    {
      name: 'twitter',
      type: 'group',
      label: 'Twitter / X',
      fields: [
        {
          name: 'card',
          type: 'select',
          defaultValue: 'summary_large_image',
          label: seoT('pluginSeo:labelCard'),
          options: [
            { label: seoT('pluginSeo:twitterCardSummary'), value: 'summary' },
            {
              label: seoT('pluginSeo:twitterCardSummaryLarge'),
              value: 'summary_large_image',
            },
          ],
        },
        {
          name: 'title',
          type: 'text',
          localized,
          label: seoT('pluginSeo:labelTitle'),
        },
        {
          name: 'description',
          type: 'textarea',
          localized,
          label: seoT('pluginSeo:labelDescription'),
        },
      ],
    },
    {
      name: 'breadcrumbTitle',
      type: 'text',
      localized,
      label: seoT('pluginSeo:breadcrumbTitleLabel'),
      admin: { description: seoT('pluginSeo:breadcrumbTitleDesc') },
    },
    buildSchemaBlocksField({ uploadsCollection, localized }),
    // Opt-in: pre-assembled JSON-LD, computed on read from the `schema` blocks.
    // Virtual (no DB column); kept out of the admin form by `SeoGroupInput`
    // (its `known` set lists `jsonLdComputed` but never renders it).
    ...(jsonLdVirtualField
      ? [
          {
            name: 'jsonLdComputed',
            type: 'json' as const,
            virtual: true,
            admin: { readOnly: true },
            hooks: {
              afterRead: [
                ({ siblingData }: { siblingData?: Record<string, unknown> }) =>
                  buildJsonLd(
                    (siblingData?.schema as SchemaBlock[] | undefined) ?? [],
                  ),
              ],
            },
          },
        ]
      : []),
  ],
})

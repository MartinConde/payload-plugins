import type { CollectionConfig } from 'payload'

import { seoStatic, seoT } from '../translations.js'

export type BuildRedirectsOptions = {
  slug: string
  /** Collections selectable as internal redirect targets. */
  collections: string[]
  overrides?: Partial<CollectionConfig>
}

/**
 * Redirects collection — one row per redirect, readable by any frontend
 * (`GET /api/{slug}`). Mirrors the official @payloadcms/plugin-redirects shape:
 * `from` (unique path) → `to` (internal doc or custom URL) with a 301/302 type.
 */
export const buildRedirectsCollection = ({
  slug,
  collections,
  overrides,
}: BuildRedirectsOptions): CollectionConfig => ({
  slug,
  // Locale-keyed objects (not functions) for the entity-level labels — these
  // are serialized toward the client; see `seoStatic` in ../translations.
  labels: {
    singular: seoStatic('pluginSeo:redirectSingular'),
    plural: seoStatic('pluginSeo:redirectPlural'),
  },
  access: { read: () => true },
  admin: {
    useAsTitle: 'from',
    defaultColumns: ['from', 'type'],
    description: seoT('pluginSeo:redirectsDesc'),
  },
  fields: [
    {
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: seoT('pluginSeo:from'),
      admin: { description: seoT('pluginSeo:fromDesc') },
    },
    {
      name: 'to',
      type: 'group',
      label: seoT('pluginSeo:to'),
      fields: [
        {
          name: 'relationshipType',
          type: 'radio',
          defaultValue: 'internal',
          label: seoT('pluginSeo:relationshipTypeLabel'),
          options: [
            { label: seoT('pluginSeo:relInternal'), value: 'internal' },
            { label: seoT('pluginSeo:relCustom'), value: 'custom' },
          ],
        },
        {
          name: 'doc',
          type: 'relationship',
          relationTo: collections,
          label: seoT('pluginSeo:docLabel'),
          admin: {
            condition: (_, siblingData) =>
              siblingData?.relationshipType === 'internal',
          },
        },
        {
          name: 'url',
          type: 'text',
          label: seoT('pluginSeo:labelUrl'),
          admin: {
            condition: (_, siblingData) =>
              siblingData?.relationshipType === 'custom',
          },
        },
      ],
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: '301',
      label: seoT('pluginSeo:redirectTypeLabel'),
      options: [
        { label: seoT('pluginSeo:type301'), value: '301' },
        { label: seoT('pluginSeo:type302'), value: '302' },
      ],
    },
  ],
  ...overrides,
})

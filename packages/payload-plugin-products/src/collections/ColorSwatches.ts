import type { CollectionConfig } from 'payload'

import { productsT } from '../translations.js'

export type BuildColorSwatchesCollectionOptions = {
  slug: string
  /** Upload collection the optional `swatch` image relates to. */
  mediaCollectionSlug: string
  overrides?: Partial<CollectionConfig>
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

/**
 * Builds the `color-swatches` collection: globally-reusable color identities
 * referenced by a product's `colors` relationship. Each swatch carries its
 * own hex value plus an optional uploaded image (used by the Designer chip
 * strip when a flat hex doesn't represent the material — e.g. heathers).
 *
 * Access: read for anyone, writes restricted to authenticated users.
 */
export const buildColorSwatchesCollection = ({
  slug,
  mediaCollectionSlug,
  overrides,
}: BuildColorSwatchesCollectionOptions): CollectionConfig => ({
  slug,
  labels: {
    singular: productsT('pluginProducts:colorSwatchSingular'),
    plural: productsT('pluginProducts:colorSwatchPlural'),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'hex', 'family', 'updatedAt'],
    description: productsT('pluginProducts:colorSwatchesDesc'),
    ...overrides?.admin,
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
    ...(overrides?.access ?? {}),
  },
  ...(overrides?.hooks ? { hooks: overrides.hooks } : {}),
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: productsT('pluginProducts:colorSwatchNameLabel'),
    },
    {
      name: 'hex',
      type: 'text',
      required: true,
      label: productsT('pluginProducts:colorSwatchHexLabel'),
      admin: { description: productsT('pluginProducts:colorSwatchHexDesc') },
      validate: ((value: unknown) => {
        if (typeof value !== 'string' || !HEX_RE.test(value)) {
          return 'pluginProducts:hexInvalid'
        }
        return true
      }) as never,
    },
    {
      name: 'swatch',
      type: 'upload',
      relationTo: mediaCollectionSlug,
      label: productsT('pluginProducts:colorSwatchSwatchLabel'),
      admin: { description: productsT('pluginProducts:colorSwatchSwatchDesc') },
    },
    {
      name: 'family',
      type: 'select',
      label: productsT('pluginProducts:colorSwatchFamilyLabel'),
      options: [
        { value: 'red', label: productsT('pluginProducts:colorFamilyRed') },
        { value: 'orange', label: productsT('pluginProducts:colorFamilyOrange') },
        { value: 'yellow', label: productsT('pluginProducts:colorFamilyYellow') },
        { value: 'green', label: productsT('pluginProducts:colorFamilyGreen') },
        { value: 'blue', label: productsT('pluginProducts:colorFamilyBlue') },
        { value: 'purple', label: productsT('pluginProducts:colorFamilyPurple') },
        { value: 'neutral', label: productsT('pluginProducts:colorFamilyNeutral') },
        { value: 'white', label: productsT('pluginProducts:colorFamilyWhite') },
        { value: 'black', label: productsT('pluginProducts:colorFamilyBlack') },
        { value: 'multi', label: productsT('pluginProducts:colorFamilyMulti') },
      ],
    },
    {
      name: 'notes',
      type: 'text',
      label: productsT('pluginProducts:colorSwatchNotesLabel'),
    },
    ...(overrides?.fields ?? []),
  ],
  ...(overrides
    ? Object.fromEntries(
        Object.entries(overrides).filter(
          ([k]) => !['admin', 'access', 'hooks', 'fields'].includes(k),
        ),
      )
    : {}),
})

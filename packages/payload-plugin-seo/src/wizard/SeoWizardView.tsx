import type { AdminViewServerProps, Field } from 'payload'
import { getTranslation } from '@payloadcms/translations'
import { XIcon } from 'lucide-react'

import {
  extractCollection,
  ViewShell,
  type ExtractedCollection,
} from 'payload-plugin-shadcn-ui'

import { SeoWizardClient } from './SeoWizardClient.js'
import type { CollectionHealth } from './audit.js'

/* Resolved plugin config stashed on `config.custom['plugin-seo']` by
   `seoPlugin` (the view is registered by string path, so options can't be
   passed to it directly). */
type SeoPluginCustom = {
  settingsSlug: string
  uploadsCollection: string
  fieldName: string
  redirectsSlug?: string
}

const DEFAULTS: SeoPluginCustom = {
  settingsSlug: 'seo-settings',
  uploadsCollection: 'media',
  fieldName: 'meta',
}

const MAX_AUDITED_COLLECTIONS = 8

/** Same detection shape as `hasMetaField` in plugin.ts: a group field named
 *  `fieldName` at the top level, or one level inside a top-level tabs field. */
const hasMetaGroup = (fields: Field[] = [], fieldName: string): boolean =>
  fields.some((f) => {
    if ('name' in f && f.name === fieldName && f.type === 'group') return true
    if (f.type === 'tabs') {
      return f.tabs.some((tab) =>
        ('fields' in tab ? tab.fields : []).some(
          (tf) => 'name' in tf && tf.name === fieldName && tf.type === 'group',
        ),
      )
    }
    return false
  })

/* RSC for the SEO setup wizard, registered at
   `admin.components.views.seoWizard` (path `/seo-wizard`) by `seoPlugin`.
   Loads the `seo-settings` global, audits per-collection meta completeness
   server-side (default locale), and renders the client stepper inside the
   shared `ViewShell` chrome. Mounted as `payload-plugin-seo/rsc#SeoWizardView`. */
export async function SeoWizardView(
  props: AdminViewServerProps,
): Promise<React.ReactElement> {
  const { initPageResult } = props
  const { req } = initPageResult
  const { payload, user, i18n } = req

  const custom = {
    ...DEFAULTS,
    ...((payload.config.custom?.['plugin-seo'] as Partial<SeoPluginCustom>) ??
      {}),
  }
  const { settingsSlug, uploadsCollection, fieldName } = custom

  // Pin the whole wizard to the default locale: read, audit, and (client-side)
  // save all target the same locale, so the completeness panel can't disagree
  // with the values the user is editing. (Per-locale roll-up is a future
  // enhancement.) `undefined` when localization is off.
  const defaultLocale =
    typeof payload.config.localization === 'object'
      ? payload.config.localization.defaultLocale
      : undefined

  // Current global values (depth 0 → uploads as ids; localized text resolved to
  // the default locale as plain strings).
  let initialData: Record<string, unknown> = {}
  try {
    initialData = (await payload.findGlobal({
      slug: settingsSlug,
      depth: 0,
      locale: defaultLocale,
      overrideAccess: false,
      req,
      user,
    })) as Record<string, unknown>
  } catch {
    // No read access or global missing — start from an empty form.
  }

  // Collections that carry the SEO meta group, capped.
  const seoCollections = (payload.config.collections ?? [])
    .filter((c) => hasMetaGroup(c.fields, fieldName))
    .slice(0, MAX_AUDITED_COLLECTIONS)

  // Serializable metadata for the upload-collection picker (the reused
  // `UploadFieldInput`): `useAsTitleBySlug` lets its `RelationshipPicker` do a
  // title search, and `uploadCollectionsBySlug` lets its "Upload new" dialog
  // render the target collection's fields. Built exactly like the auto doc
  // view does.
  const useAsTitleBySlug: Record<string, string | undefined> = {}
  const uploadCollectionsBySlug: Record<string, ExtractedCollection> = {}
  for (const c of payload.config.collections ?? []) {
    useAsTitleBySlug[c.slug] = c.admin?.useAsTitle
    if (c.upload) uploadCollectionsBySlug[c.slug] = extractCollection(c, i18n)
  }

  // Per-collection completeness: docs missing a meta title OR description.
  // Access-scoped and isolated so one failing collection can't blank the panel
  // (same defensive pattern as AutoDashboardView).
  const collections: CollectionHealth[] = (
    await Promise.all(
      seoCollections.map(async (c): Promise<CollectionHealth | null> => {
        try {
          const [{ totalDocs: total }, { totalDocs: missing }] =
            await Promise.all([
              payload.count({
                collection: c.slug,
                overrideAccess: false,
                req,
                user,
              }),
              payload.count({
                collection: c.slug,
                where: {
                  or: [
                    { [`${fieldName}.title`]: { exists: false } },
                    { [`${fieldName}.description`]: { exists: false } },
                  ],
                },
                locale: defaultLocale,
                overrideAccess: false,
                req,
                user,
              }),
            ])
          const plural = c.labels?.plural
          const label =
            plural && typeof plural !== 'function'
              ? getTranslation(plural, i18n)
              : c.slug
          return { slug: c.slug, label, total, missing }
        } catch {
          return null
        }
      }),
    )
  ).filter((c): c is CollectionHealth => c !== null)

  return (
    <ViewShell
      breadcrumbs={[
        { label: i18n.t('pluginSeo:wizardTitle' as Parameters<typeof i18n.t>[0]) },
      ]}
      headerActions={
        <a
          href={`/admin/globals/${settingsSlug}`}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <XIcon className="size-4" />
          {i18n.t('pluginSeo:wizardExit' as Parameters<typeof i18n.t>[0])}
        </a>
      }
    >
      <SeoWizardClient
        settingsSlug={settingsSlug}
        mediaSlug={uploadsCollection}
        initialData={initialData}
        collections={collections}
        collectionSlugs={seoCollections.map((c) => c.slug)}
        defaultLocale={defaultLocale ?? null}
        useAsTitleBySlug={useAsTitleBySlug}
        uploadCollectionsBySlug={uploadCollectionsBySlug}
      />
    </ViewShell>
  )
}

import type { DocumentViewServerProps } from '../../internal/payloadAdapter.js'

import { AutoDocFormBridge } from './AutoDocFormBridge.js'
import { DocViewTabs } from './DocViewTabs.js'
import { ViewShell } from 'payload-plugin-shadcn-ui'
import {
  extractCollection,
  stringifyLabel,
  type ExtractedCollection,
} from 'payload-plugin-shadcn-ui'
import { extractGlobal } from 'payload-plugin-shadcn-ui'
import { extractRichTextRenderedFields } from './richtext/extractRichTextRenderedFields.js'
import type { ExtractedLocale } from './localization/LocaleSwitcher.js'

/* Memoise per-render-scanning maps keyed on (payload.config, admin-language).
   `payload.config.collections` is mutation-stable after boot, so a WeakMap on
   the config reference is safe. The inner Map keys on the admin-side
   language so two render passes with different active languages don't
   collide (label extraction inside `extractCollection` is language-aware). */
type DocSlugMaps = {
  useAsTitleBySlug: Record<string, string | undefined>
  uploadCollectionsBySlug: Record<string, ExtractedCollection>
}
const DOC_SLUG_MAPS_CACHE: WeakMap<object, Map<string, DocSlugMaps>> =
  new WeakMap()

const getDocSlugMaps = (
  config: any,
  i18n: DocumentViewServerProps['i18n'] | undefined,
): DocSlugMaps => {
  if (!config) return { useAsTitleBySlug: {}, uploadCollectionsBySlug: {} }
  const langKey = (i18n as { language?: string } | undefined)?.language ?? '__no-i18n__'
  let perLang = DOC_SLUG_MAPS_CACHE.get(config)
  if (!perLang) {
    perLang = new Map()
    DOC_SLUG_MAPS_CACHE.set(config, perLang)
  }
  const hit = perLang.get(langKey)
  if (hit) return hit
  const useAsTitleBySlug: Record<string, string | undefined> = {}
  const uploadCollectionsBySlug: Record<string, ExtractedCollection> = {}
  for (const c of config.collections ?? []) {
    useAsTitleBySlug[c.slug] = c.admin?.useAsTitle
    if (c.upload) {
      uploadCollectionsBySlug[c.slug] = extractCollection(c, i18n as any)
    }
  }
  const next: DocSlugMaps = { useAsTitleBySlug, uploadCollectionsBySlug }
  perLang.set(langKey, next)
  return next
}

const titleCase = (slug: string): string =>
  slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const pluralLabel = (collection: {
  slug: string
  labels?: { plural?: unknown } | null
}): string =>
  stringifyLabel(collection.labels?.plural) ?? titleCase(collection.slug)

const singularLabel = (collection: {
  slug: string
  labels?: { singular?: unknown } | null
}): string =>
  stringifyLabel(collection.labels?.singular) ?? titleCase(collection.slug)

/* Server component installed at admin.components.views.edit.default by the
   `defaultDocView` (collections) and `defaultGlobalView` (globals) plugin
   options. Covers BOTH create (no id) and edit (id present) modes for
   collections; globals are singletons (always edit-mode, no id, upsert).
   The create-vs-edit / collection-vs-global split lives in the client bridge.

   Mounted as `payload-plugin-shadcn-admin/rsc#AutoCollectionDocView`. */
export async function AutoCollectionDocView(
  serverProps: DocumentViewServerProps,
) {
  const { initPageResult, doc } = serverProps
  const collection = initPageResult?.collectionConfig
  const global = initPageResult?.globalConfig
  // Globals populate `globalConfig` instead of `collectionConfig` and never
  // carry a `docID` (singleton, routed by slug). When a global is present we
  // run a parallel branch that reuses the same bridge/field machinery.
  const isGlobal = Boolean(global) && !collection
  const entity = isGlobal ? global : collection
  const entitySlug = entity?.slug
  const docID = initPageResult?.docID
  // Field-level access control lives on `useDocumentInfo().docPermissions`
  // in the client (Payload's DocumentInfoProvider populates it before our
  // bridge mounts). The RSC wrapper has nothing to lift here — v3.7's
  // access-control hiding reads it directly inside the bridge.

  if (!entity || !entitySlug) {
    return (
      <ViewShell breadcrumbs={[{ label: serverProps.i18n.t('general:document') }]}>
        <p className="text-muted-foreground">
          Could not resolve {isGlobal ? 'global' : 'collection'} from server
          props.
        </p>
      </ViewShell>
    )
  }

  const serializableCollection = isGlobal
    ? extractGlobal(global, serverProps.i18n)
    : extractCollection(collection, serverProps.i18n)

  const payload = serverProps.payload
  // Both maps are derived purely from `payload.config.collections` (which
  // Payload only mutates at boot) and the admin language. Memoised by
  // (config, language) so RSC renders past the first don't re-walk every
  // collection's field tree via `extractCollection`. `extractCollection`
  // itself is also memoised at the shadcn-ui boundary, so the second-level
  // cost here is just the slug → useAsTitle scan.
  const { useAsTitleBySlug, uploadCollectionsBySlug } = getDocSlugMaps(
    payload?.config,
    serverProps.i18n,
  )

  // v3.8 — localization plumbing. Read locales config from the sanitized
  // Payload config; when present (and multiple locales exist), the bridge
  // renders a LocaleSwitcher and partitions dirty/values per locale.
  const localizationConfig = payload?.config?.localization
  let locales: ExtractedLocale[] | undefined
  let defaultLocale: string | undefined
  let initialLocale: string | undefined
  if (localizationConfig) {
    locales = localizationConfig.locales.map((loc: any) =>
      typeof loc === 'string'
        ? { code: loc, label: loc, rtl: false }
        : {
            code: loc.code,
            label: stringifyLabel(loc.label) ?? loc.code,
            rtl: Boolean(loc.rtl),
          },
    )
    defaultLocale = localizationConfig.defaultLocale
    // Active locale: URL `?locale=` is reflected on initPageResult.locale by
    // Payload's request pipeline; falls back to defaultLocale.
    initialLocale = initPageResult?.locale?.code ?? defaultLocale
  }

  // Globals are singletons → always edit-mode (upsert). Collections split
  // create/edit on docID presence.
  const mode: 'create' | 'edit' =
    isGlobal || docID !== undefined ? 'edit' : 'create'

  // v3.8 — when localization is configured AND we're in edit mode, supplement
  // Payload's upstream single-locale fetch with a `?locale=all` refetch so
  // initialValues carry every locale's value as `{en, fr, …}` per localized
  // field. Pre-rendered richText `customComponents.Field` elements stay on
  // their original (URL-active) locale; the bridge pays a getFormState
  // round-trip on the first locale switch to refresh them.
  let initialValues: Record<string, unknown> =
    mode === 'edit' && doc && typeof doc === 'object'
      ? (doc as Record<string, unknown>)
      : {}
  if (mode === 'edit' && localizationConfig && payload) {
    try {
      // CRITICAL: when drafts are enabled, pass `draft: true` so the refetch
      // returns the latest draft values (matching what Payload's own
      // `getDocumentData.js` does for `serverProps.doc`). Without this, the
      // refetch returns the PUBLISHED version, which means any draft-only
      // edits silently revert to empty on `router.refresh()` after a save.
      const draftsOn = Boolean((entity as any).versions?.drafts)
      const allLocalesDoc = isGlobal
        ? await payload.findGlobal({
            slug: entitySlug,
            locale: 'all',
            depth: 0,
            fallbackLocale: false,
            draft: draftsOn,
            req: initPageResult?.req,
            overrideAccess: false,
          })
        : docID !== undefined
          ? await payload.findByID({
              collection: entitySlug,
              id: docID,
              locale: 'all',
              depth: 0,
              fallbackLocale: false,
              draft: draftsOn,
              req: initPageResult?.req,
              overrideAccess: false,
            })
          : null
      if (allLocalesDoc && typeof allLocalesDoc === 'object') {
        initialValues = allLocalesDoc as Record<string, unknown>
      }
    } catch {
      // Fall back to the single-locale `doc` already in initialValues.
    }
  }

  // Globals have no `useAsTitle`; the breadcrumb leaf is just the global label
  // (extractGlobal maps `global.label` → labels.singular).
  const globalLabel =
    serializableCollection.labels?.singular ?? titleCase(entitySlug)
  const useAsTitle = serializableCollection.admin?.useAsTitle
  // Localized collections refetch `initialValues` with `locale: 'all'`, so the
  // useAsTitle field is a per-locale object `{ en: '…', fr: '…' }` rather than a
  // string. Resolve a display string (URL-active locale → default → any non-empty)
  // so the breadcrumb shows the title instead of falling back to the doc ID.
  const resolveTitleValue = (raw: unknown): string | undefined => {
    if (typeof raw === 'string') return raw || undefined
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      for (const code of [initialLocale, defaultLocale]) {
        if (code && typeof obj[code] === 'string' && obj[code]) {
          return obj[code] as string
        }
      }
      for (const v of Object.values(obj)) {
        if (typeof v === 'string' && v) return v
      }
    }
    return undefined
  }
  const titleValue = useAsTitle
    ? resolveTitleValue(initialValues[useAsTitle])
    : undefined
  const editTitle = isGlobal
    ? globalLabel
    : mode === 'edit'
      ? (titleValue ?? String(docID))
      : null

  // Lift Payload's pre-built richText Field elements out of formState. Payload's
  // DocumentView pipeline ran renderField for every field before invoking us;
  // for richText fields that produces a fully-resolved <RichTextField/> element
  // (with all heavy lexical props baked in) at
  // formState[path].customComponents.Field. The bridge mounts each one inside
  // a small Form shim. See richtext/extractRichTextRenderedFields.ts.
  const initialRichTextRendered = extractRichTextRenderedFields(
    serializableCollection,
    initialValues,
    (serverProps as { formState?: Record<string, any> }).formState,
  )

  const operation: 'create' | 'update' =
    mode === 'edit' ? 'update' : 'create'

  // Initial upload preview for edit mode on upload collections. Payload's
  // upload-collection docs always carry these flat fields when a file is
  // present; we pass them through to the bridge so the header can render a
  // thumbnail without an extra round trip. Create mode passes null.
  const isUpload = Boolean(serializableCollection.upload)
  const initialUploadDoc =
    isUpload && mode === 'edit' && doc && typeof doc === 'object'
      ? {
          url:
            typeof (doc as any).url === 'string' ? (doc as any).url : '',
          thumbnailURL:
            typeof (doc as any).thumbnailURL === 'string'
              ? (doc as any).thumbnailURL
              : null,
          filename:
            typeof (doc as any).filename === 'string'
              ? (doc as any).filename
              : null,
          mimeType:
            typeof (doc as any).mimeType === 'string'
              ? (doc as any).mimeType
              : null,
          filesize:
            typeof (doc as any).filesize === 'number'
              ? (doc as any).filesize
              : null,
          width:
            typeof (doc as any).width === 'number' ? (doc as any).width : null,
          height:
            typeof (doc as any).height === 'number'
              ? (doc as any).height
              : null,
          crop:
            (doc as any).crop && typeof (doc as any).crop === 'object'
              ? (doc as any).crop
              : null,
          focalPoint:
            (doc as any).focalPoint && typeof (doc as any).focalPoint === 'object'
              ? (doc as any).focalPoint
              : null,
        }
      : null

  const hasVersions = Boolean(serializableCollection.versions)

  const t = serverProps.i18n.t
  const breadcrumbs = isGlobal
    ? [
        { label: t('general:globals') },
        { label: globalLabel, href: `/admin/globals/${entitySlug}` },
      ]
    : [
        { label: t('general:collections') },
        {
          label: pluralLabel(collection as any),
          href: `/admin/collections/${entitySlug}`,
        },
        {
          label:
            mode === 'create'
              ? t('general:createNewLabel', {
                  label: singularLabel(collection as any),
                })
              : (editTitle ?? t('general:edit')),
        },
      ]

  return (
    <ViewShell
      className="shadcn-auto-doc-view"
      headerActions={
        isGlobal || mode === 'edit' ? (
          <DocViewTabs hasVersions={hasVersions} />
        ) : undefined
      }
      breadcrumbs={breadcrumbs}
    >
      <AutoDocFormBridge
        mode={mode}
        collectionSlug={isGlobal ? undefined : entitySlug}
        globalSlug={isGlobal ? entitySlug : undefined}
        docId={docID}
        collection={serializableCollection}
        useAsTitleBySlug={useAsTitleBySlug}
        uploadCollectionsBySlug={uploadCollectionsBySlug}
        initialValues={initialValues}
        initialRichTextRendered={initialRichTextRendered}
        operation={operation}
        initialUploadDoc={initialUploadDoc}
        locales={locales}
        defaultLocale={defaultLocale}
        initialLocale={initialLocale}
      />
    </ViewShell>
  )
}

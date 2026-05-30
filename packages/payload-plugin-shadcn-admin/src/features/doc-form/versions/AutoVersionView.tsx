import type { DocumentViewServerProps } from '../../../internal/payloadAdapter.js'
import type { TFunction } from '../../../internal/payloadAdapter.js'
import { ArrowRightIcon } from 'lucide-react'

import type { ShadcnAdminTranslationsKeys } from '../../../translations.js'
import { ViewShell } from 'payload-plugin-shadcn-ui'
import { Badge } from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import {
  extractCollection,
  stringifyLabel,
} from 'payload-plugin-shadcn-ui'
import { extractGlobal } from 'payload-plugin-shadcn-ui'
import { DocViewTabs } from '../DocViewTabs.js'
import { hasDraftsEnabled } from '../drafts/draftsConfig.js'
import { persistedStatusPill, toneClassName } from '../drafts/statusPill.js'
import { buildDiffFields } from './buildDiffFields.js'
import { extractLocales } from './serverHelpers.js'
import { SelectComparison, type ComparisonOption } from './SelectComparison.js'
import { SelectLocales } from './SelectLocales.js'
import { RestoreVersion } from './RestoreVersion.js'

const titleCase = (slug: string): string =>
  slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const fmt = (iso: unknown): string => {
  if (typeof iso !== 'string') return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

type VersionDoc = {
  id: string | number
  updatedAt?: string
  autosave?: boolean
  version?: { _status?: 'draft' | 'published' } & Record<string, unknown>
}

function StatusPill({
  status,
  t,
}: {
  status: 'draft' | 'published' | null
  t?: (key: any, options?: any) => string
}) {
  if (!status) return null
  const pill = persistedStatusPill(status, t)
  return (
    <Badge variant="outline" className={cn('font-medium', toneClassName(pill.tone))}>
      {pill.label}
    </Badge>
  )
}

/* Single version DIFF view, installed at `admin.components.views.edit.version`.
   Mirrors Payload's data-flow (fetch versionTo / versionFrom / comparison
   options + selected locales from URL params) but renders the field diff with
   the plugin's own walk (buildDiffFields) on `@payloadcms/ui` primitives.
   Mounted as `payload-plugin-shadcn-admin/rsc#AutoVersionView`. v3.9. */
export async function AutoVersionView(serverProps: DocumentViewServerProps) {
  const { initPageResult, searchParams, payload, routeSegments, i18n } =
    serverProps
  const t = i18n.t as TFunction<ShadcnAdminTranslationsKeys>
  const collection = initPageResult?.collectionConfig
  const global = initPageResult?.globalConfig
  const isGlobal = Boolean(global) && !collection
  const entity = isGlobal ? global : collection
  const entitySlug = entity?.slug
  const docID = initPageResult?.docID

  if (!entity || !entitySlug || (!isGlobal && docID === undefined)) {
    return (
      <ViewShell breadcrumbs={[{ label: t('version:version') }]}>
        <p className="text-muted-foreground">
          {t('shadcnAdmin:couldNotResolveDocument')}
        </p>
      </ViewShell>
    )
  }

  const versionToID = routeSegments?.[routeSegments.length - 1]
  const basePath = isGlobal
    ? `/admin/globals/${entitySlug}`
    : `/admin/collections/${entitySlug}/${docID}`

  const versionTo = (await (isGlobal
    ? payload.findGlobalVersionByID({
        slug: entitySlug,
        id: String(versionToID),
        locale: 'all',
        depth: 1,
        req: initPageResult?.req,
        overrideAccess: false,
        disableErrors: true,
      })
    : payload.findVersionByID({
        collection: entitySlug,
        id: String(versionToID),
        locale: 'all',
        depth: 1,
        req: initPageResult?.req,
        overrideAccess: false,
        disableErrors: true,
      })
  ).catch((): null => null)) as VersionDoc | null

  const entityLabel = isGlobal
    ? (stringifyLabel((global as any).label, i18n) ?? titleCase(entitySlug))
    : (stringifyLabel((collection as any).labels?.plural, i18n) ??
      titleCase(entitySlug))
  const baseCrumbs = isGlobal
    ? [
        { label: t('general:globals') },
        { label: entityLabel, href: basePath },
        { label: t('version:versions'), href: `${basePath}/versions` },
      ]
    : [
        { label: t('general:collections') },
        { label: entityLabel, href: `/admin/collections/${entitySlug}` },
        { label: String(docID), href: basePath },
        { label: t('version:versions'), href: `${basePath}/versions` },
      ]

  if (!versionTo) {
    return (
      <ViewShell
        className="shadcn-auto-doc-view"
        headerActions={<DocViewTabs active="versions" />}
        breadcrumbs={[...baseCrumbs, { label: t('version:version') }]}
      >
        <p className="text-muted-foreground">
          {t('shadcnAdmin:versionNotFound')}
        </p>
      </ViewShell>
    )
  }

  // Locale selection from `?localeCodes` (JSON array) else all configured.
  const localeInfo = extractLocales(payload?.config?.localization)
  const allLocaleCodes = (localeInfo?.locales ?? []).map((l) => l.code)
  let selectedLocales = allLocaleCodes
  if (typeof searchParams?.localeCodes === 'string') {
    try {
      const parsed = JSON.parse(searchParams.localeCodes)
      if (Array.isArray(parsed) && parsed.length > 0) {
        selectedLocales = parsed.filter((c) => allLocaleCodes.includes(c))
      }
    } catch {
      // ignore malformed param; fall back to all locales
    }
  }

  // versionFrom: explicit `?versionFrom` else the version immediately prior.
  const versionFromIDParam =
    typeof searchParams?.versionFrom === 'string'
      ? searchParams.versionFrom
      : null

  // Per-doc `parent` filter only applies to collections; globals' version
  // queries scope to the parent global by slug.
  const parentFilter = isGlobal
    ? []
    : [{ parent: { equals: docID } }]
  const findVersionByIDFor = (id: string) =>
    isGlobal
      ? payload.findGlobalVersionByID({
          slug: entitySlug,
          id,
          locale: 'all',
          depth: 1,
          req: initPageResult?.req,
          overrideAccess: false,
          disableErrors: true,
        })
      : payload.findVersionByID({
          collection: entitySlug,
          id,
          locale: 'all',
          depth: 1,
          req: initPageResult?.req,
          overrideAccess: false,
          disableErrors: true,
        })
  const findVersionsFor = (where: Record<string, unknown>, limit: number) =>
    isGlobal
      ? payload.findGlobalVersions({
          slug: entitySlug,
          where: where as any,
          sort: '-updatedAt',
          limit,
          depth: limit === 1 ? 1 : 0,
          locale: 'all',
          req: initPageResult?.req,
          overrideAccess: false,
        })
      : payload.findVersions({
          collection: entitySlug,
          where: where as any,
          sort: '-updatedAt',
          limit,
          depth: limit === 1 ? 1 : 0,
          locale: 'all',
          req: initPageResult?.req,
          overrideAccess: false,
        })

  let versionFrom: VersionDoc | null = null
  if (versionFromIDParam) {
    versionFrom = (await findVersionByIDFor(versionFromIDParam).catch(
      (): null => null,
    )) as VersionDoc | null
  }
  if (!versionFrom) {
    const prev = await findVersionsFor(
      {
        and: [
          ...parentFilter,
          { updatedAt: { less_than: versionTo.updatedAt } },
        ],
      },
      1,
    ).catch((): null => null)
    versionFrom = (prev?.docs?.[0] as VersionDoc | undefined) ?? null
  }

  // Comparison dropdown options: recent versions of this doc (excluding the
  // target), labelled by timestamp + status.
  const optionsResult = await findVersionsFor(
    parentFilter.length > 0 ? { and: parentFilter } : {},
    50,
  ).catch((): null => null)
  const comparisonOptions: ComparisonOption[] = (optionsResult?.docs ?? [])
    .filter((v: any) => String(v.id) !== String(versionTo.id))
    .map((v: any) => {
      const status =
        v.version?._status === 'published'
          ? t('version:published')
          : t('version:draft')
      return { value: String(v.id), label: `${fmt(v.updatedAt)} · ${status}` }
    })

  const extracted = isGlobal
    ? extractGlobal(global, i18n)
    : extractCollection(collection, i18n)
  const fields = extracted.fields
  const draftsEnabled = hasDraftsEnabled(extracted)

  const diffRows = buildDiffFields({
    fields,
    valuesFrom: versionFrom?.version,
    valuesTo: versionTo.version,
    selectedLocales,
    locales: localeInfo?.locales ?? [],
    i18n,
  })

  // `_status` is a plain string normally, but a locale-keyed object when
  // `localizeStatus` is on — in which case a single header pill is ambiguous,
  // so we suppress it (the per-locale status changes show in the diff rows).
  const statusOf = (v: VersionDoc | null): 'draft' | 'published' | null =>
    typeof v?.version?._status === 'string' ? v.version._status : null
  const toStatus = statusOf(versionTo)
  const fromStatus = statusOf(versionFrom)

  return (
    <ViewShell
      className="shadcn-auto-doc-view"
      headerActions={<DocViewTabs active="versions" hasVersions />}
      breadcrumbs={[
        ...baseCrumbs,
        { label: fmt(versionTo.updatedAt) || t('version:version') },
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SelectComparison
            options={comparisonOptions}
            selected={versionFromIDParam}
          />
          {localeInfo && localeInfo.locales.length > 0 ? (
            <SelectLocales
              locales={localeInfo.locales.map((l) => ({
                code: l.code,
                label: l.label,
              }))}
              selected={selectedLocales}
            />
          ) : null}
        </div>
        <RestoreVersion
          collectionSlug={isGlobal ? undefined : entitySlug}
          globalSlug={isGlobal ? entitySlug : undefined}
          versionId={String(versionTo.id)}
          basePath={basePath}
          draftsEnabled={draftsEnabled}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Before
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium tabular-nums">
              {fmt(versionFrom?.updatedAt) || '—'}
            </span>
            <StatusPill status={fromStatus} t={i18n.t} />
          </div>
        </div>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
        <div className="flex flex-col gap-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            After
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium tabular-nums">
              {fmt(versionTo.updatedAt)}
            </span>
            <StatusPill status={toStatus} t={i18n.t} />
          </div>
        </div>
      </div>

      {diffRows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card py-14 text-center text-sm text-muted-foreground">
          No differences between these versions.
        </div>
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-lg border bg-card">
          {diffRows.map((row, i) => (
            <div key={i} className="px-5 py-4">
              {row}
            </div>
          ))}
        </div>
      )}
    </ViewShell>
  )
}

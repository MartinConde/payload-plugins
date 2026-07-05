import type { AdminViewServerProps, Payload, PayloadRequest, TFunction } from '../../internal/payloadAdapter.js'

import { ViewShell } from 'payload-plugin-shadcn-ui'
import { stringifyLabel } from 'payload-plugin-shadcn-ui'
import { DashboardGrid, type DashboardWidget } from './DashboardGrid.js'
import { CollectionsWidget, RecentlyUpdatedWidget } from './DashboardWidgets.js'
import type { DashboardSection, RecentDoc } from './DashboardWidgets.js'
import { OpenPanelAnalyticsWidget } from './OpenPanelAnalyticsWidget.js'
import type { ShadcnAdminTranslationsKeys } from '../../translations.js'

/* Shape of an entry in the `navGroups` prop Payload's DashboardView hands us
   (built by `@payloadcms/ui` `groupNavItems`). Already filtered to entities the
   user can `read` and grouped by `admin.group`; `label` is a resolved string,
   `entity.label` may still be a StaticLabel object. */
type NavGroup = {
  entities: { label: unknown; slug: string; type: 'collections' | 'globals' }[]
  label: string
}

/* The serverProps Payload's DashboardView passes to the configured
   `views.dashboard.Component` (see @payloadcms/next Dashboard/index.js):
   `{ ...AdminViewServerProps, navGroups, payload, i18n, ... }`. */
type DashboardViewProps = AdminViewServerProps & {
  navGroups?: NavGroup[]
  payload: Payload
}

const titleCase = (slug: string): string =>
  slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

/* RSC installed at `admin.components.views.dashboard` by the `defaultDashboard`
   plugin option. The root `/admin` route is hardcoded to Payload's DashboardView,
   but that view renders `views.dashboard.Component` with its own DefaultDashboard
   as fallback — so this slot replaces the landing page, and a consumer-defined
   dashboard wins (we never register over it). Reuses the access-controlled,
   `admin.group`-grouped `navGroups` prop for grouping and adds live per-collection
   counts via `payload.count` (no count mechanism exists in the sidebar Nav to
   reuse). Mounted as `payload-plugin-shadcn-admin/rsc#AutoDashboardView`. */
export async function AutoDashboardView(props: DashboardViewProps) {
  const { initPageResult, navGroups = [] } = props
  const { req } = initPageResult
  const { i18n, payload, user } = req
  const dashboardLabel = i18n.t('general:dashboard')

  const collectionConfigBySlug = new Map(
    (payload.config.collections ?? []).map((c) => [c.slug, c]),
  )

  const labelFor = (entity: NavGroup['entities'][number]): string =>
    stringifyLabel(entity.label) ?? titleCase(entity.slug)

  // Live counts for every readable collection in the nav groups, in parallel.
  // overrideAccess: false keeps the count scoped to what the user may read.
  const countEntries = navGroups.flatMap((group) =>
    group.entities.filter((e) => e.type === 'collections'),
  )
  const counts = new Map<string, number>()
  await Promise.all(
    countEntries.map(async (entity) => {
      try {
        const { totalDocs } = await payload.count({
          collection: entity.slug,
          overrideAccess: false,
          req,
          user,
        })
        counts.set(entity.slug, totalDocs)
      } catch {
        // Leave the count undefined if the user can't count this collection.
      }
    }),
  )

  const sections: DashboardSection[] = navGroups
    .map((group) => ({
      label: group.label,
      items: group.entities.map((entity) => {
        if (entity.type === 'globals') {
          return {
            label: labelFor(entity),
            listHref: `/admin/globals/${entity.slug}`,
            slug: entity.slug,
            type: 'globals' as const,
          }
        }
        return {
          count: counts.get(entity.slug),
          createHref: `/admin/collections/${entity.slug}/create`,
          label: labelFor(entity),
          listHref: `/admin/collections/${entity.slug}`,
          slug: entity.slug,
          type: 'collections' as const,
        }
      }),
    }))
    .filter((section) => section.items.length > 0)

  const recent = await buildRecentDocs({ collectionConfigBySlug, countEntries, req })

  // Built-in widgets, in their default order. DashboardGrid makes this stack
  // drag-to-reorder and persists the chosen order per-user; a widget with no
  // content to show is omitted entirely rather than rendered empty.
  const t = i18n.t as TFunction<ShadcnAdminTranslationsKeys>

  const widgets: DashboardWidget[] = []
  if (recent.length > 0) {
    const label = t('shadcnAdmin:recentlyUpdated')
    widgets.push({
      id: 'recently-updated',
      label,
      node: <RecentlyUpdatedWidget recent={recent} title={label} />,
    })
  }
  if (sections.length > 0) {
    widgets.push({
      id: 'collections',
      label: i18n.t('general:collections'),
      node: <CollectionsWidget sections={sections} />,
    })
  }

  // OpenPanel analytics widget — only shown when the server is configured
  // with a read/root client for the project. Secrets stay server-side; the
  // client's browser never sees them (see OpenPanelAnalyticsWidget.tsx).
  const openPanelClientId = process.env.OPENPANEL_CLIENT_ID
  const openPanelClientSecret = process.env.OPENPANEL_CLIENT_SECRET
  const openPanelProjectId = process.env.OPENPANEL_PROJECT_ID
  if (openPanelClientId && openPanelClientSecret && openPanelProjectId) {
    const label = t('shadcnAdmin:openPanelAnalytics')
    const node = await OpenPanelAnalyticsWidget({
      apiUrl: process.env.OPENPANEL_API_URL || 'https://api.openpanel.dev',
      clientId: openPanelClientId,
      clientSecret: openPanelClientSecret,
      description: t('shadcnAdmin:openPanelAnalyticsLast7Days'),
      labels: {
        avgSessionDuration: t('shadcnAdmin:openPanelAvgSessionDuration'),
        bounceRate: t('shadcnAdmin:openPanelBounceRate'),
        pageviews: t('shadcnAdmin:openPanelPageviews'),
        visitors: t('shadcnAdmin:openPanelVisitors'),
      },
      projectId: openPanelProjectId,
      title: label,
    })
    if (node) {
      widgets.push({ id: 'openpanel-analytics', label, node })
    }
  }

  return (
    <ViewShell breadcrumbs={[{ label: dashboardLabel }]}>
      <DashboardGrid widgets={widgets} />
    </ViewShell>
  )
}

/* Capped cross-collection "Recently updated" strip. Payload has no single-query
   recent-across-collections, so we sample the first few readable collections
   that keep timestamps, sort each by -updatedAt, merge, and take the top slice.
   Each find is access-scoped (overrideAccess: false) and isolated in try/catch
   so one failing collection doesn't blank the strip. */
async function buildRecentDocs({
  collectionConfigBySlug,
  countEntries,
  req,
}: {
  collectionConfigBySlug: Map<string, { admin?: { useAsTitle?: string }; timestamps?: boolean }>
  countEntries: { slug: string; label: unknown }[]
  req: PayloadRequest
}): Promise<RecentDoc[]> {
  const { payload, user } = req
  const RECENT_COLLECTION_CAP = 5
  const PER_COLLECTION = 5
  const TOTAL = 8

  const timestamped = countEntries
    .filter((e) => collectionConfigBySlug.get(e.slug)?.timestamps !== false)
    .slice(0, RECENT_COLLECTION_CAP)

  const results = await Promise.all(
    timestamped.map(async (entity) => {
      const config = collectionConfigBySlug.get(entity.slug)
      const useAsTitle = config?.admin?.useAsTitle
      const collectionLabel = stringifyLabel(entity.label) ?? titleCase(entity.slug)
      try {
        const { docs } = await payload.find({
          collection: entity.slug,
          depth: 0,
          limit: PER_COLLECTION,
          overrideAccess: false,
          req,
          sort: '-updatedAt',
          user,
        })
        return docs.map((doc): RecentDoc => {
          const record = doc as Record<string, unknown>
          const titleValue = useAsTitle ? record[useAsTitle] : undefined
          return {
            collectionLabel,
            href: `/admin/collections/${entity.slug}/${String(record.id)}`,
            title:
              typeof titleValue === 'string' && titleValue.length > 0
                ? titleValue
                : String(record.id),
            updatedAt:
              typeof record.updatedAt === 'string' ? record.updatedAt : null,
          }
        })
      } catch {
        return [] as RecentDoc[]
      }
    }),
  )

  return results
    .flat()
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, TOTAL)
}

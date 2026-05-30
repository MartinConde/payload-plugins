import type { ListViewServerProps, PaginatedDocs } from '../../internal/payloadAdapter.js'

import { AutoColumnsBridge } from './AutoColumnsBridge.js'
import { ViewShell } from 'payload-plugin-shadcn-ui'
import { FolderBrowserClient } from '../folder-view/FolderBrowserClient.js'
import { FolderListToggle } from '../folder-view/FolderListToggle.js'
import { getCollectionFolderData } from '../folder-view/getCollectionFolderData.js'
import { DEFAULT_PAGE_SIZE } from './prefs/useDataTableUrlState.js'
import {
  extractCollection,
  stringifyLabel,
} from 'payload-plugin-shadcn-ui'
import {
  buildListPopulate,
  buildListSelect,
  collectionNeedsDepthOne,
  pickFieldNames,
} from './columns/fieldPicker.js'
import { renderNativeCells } from './columns/renderNativeCells.js'
import { getGroupableFields } from './columns/groupable.js'
import { GroupByMenu } from './grouping/GroupByMenu.js'
import { GroupedListView } from './grouping/GroupedListView.js'
import { getGroupedData } from './grouping/getGroupedData.js'
import { parseWhere } from './filters/parseWhere.js'

type SearchParams = Record<string, string | string[] | undefined>

const titleCase = (slug: string): string =>
  slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const pluralLabel = (collection: {
  slug: string
  labels?: { plural?: unknown } | null
}): string =>
  stringifyLabel(collection.labels?.plural) ?? titleCase(collection.slug)

const firstString = (
  v: string | string[] | undefined,
): string | undefined => (Array.isArray(v) ? v[0] : v)

const toInt = (
  v: string | string[] | undefined,
  fallback: number,
): number => {
  const s = firstString(v)
  if (!s) return fallback
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : fallback
}

export async function AutoCollectionListView(
  serverProps: ListViewServerProps,
) {
  const {
    collectionSlug,
    hasCreatePermission,
    hasDeletePermission,
    hasTrashPermission,
    limit,
    newDocumentURL,
    payload,
    searchParams,
    viewType,
  } = serverProps

  // `/collections/:slug/trash` flows through this same component: Payload's
  // TrashView calls renderListView({ trash: true, viewType: 'trash' }), which
  // renders our `views.list.Component`. We branch on viewType to filter to
  // soft-deleted docs and swap in restore / permanent-delete actions.
  const isTrash = viewType === 'trash'
  const t = serverProps.i18n?.t

  const collection = payload?.config?.collections?.find(
    (c) => c.slug === collectionSlug,
  )

  if (!collection) {
    return (
      <ViewShell breadcrumbs={[{ label: collectionSlug ?? 'Unknown' }]}>
        <p className="text-muted-foreground">
          Collection &quot;{collectionSlug}&quot; not found in Payload config.
        </p>
      </ViewShell>
    )
  }

  const foldersEnabled = Boolean((collection as any).folders) && Boolean(payload.config.folders)
  const listBasePath = `/admin/collections/${collectionSlug}`

  // Folder mode: `/collections/:slug?view=folders`. We branch on our own query
  // param (NOT Payload's `listViewType` preference, which would route to
  // Payload's hardcoded folder view) and render the shadcn folder browser
  // scoped to this collection.
  const sp = searchParams as SearchParams | undefined
  if (!isTrash && foldersEnabled && firstString(sp?.view) === 'folders') {
    const foldersConfig = payload.config.folders as {
      slug: string
      fieldName: string
    }
    const folderID = firstString(sp?.folderID) ?? null
    const collTitle = pluralLabel(collection as any)
    const { breadcrumbs, subfolders, documents } = await getCollectionFolderData({
      payload,
      user: serverProps.user,
      locale: serverProps.locale?.code,
      collectionSlug,
      foldersSlug: foldersConfig.slug,
      folderFieldName: foldersConfig.fieldName,
      folderID,
      useAsTitle: collection.admin?.useAsTitle,
      isUpload: Boolean((collection as any).upload),
    })
    return (
      <ViewShell
        breadcrumbs={[{ label: collTitle }]}
        headerActions={<FolderListToggle basePath={listBasePath} mode="folders" />}
      >
        <FolderBrowserClient
          basePath={listBasePath}
          adminRoute="/admin"
          foldersSlug={foldersConfig.slug}
          folderFieldName={foldersConfig.fieldName}
          currentFolderID={folderID}
          breadcrumbs={breadcrumbs}
          subfolders={subfolders}
          documents={documents}
          extraQuery={{ view: 'folders' }}
          rootLabel={collTitle}
        />
      </ViewShell>
    )
  }

  const serializableCollection = extractCollection(collection, serverProps.i18n)
  const useAsTitleBySlug: Record<string, string | undefined> = {}
  for (const c of payload.config.collections ?? []) {
    useAsTitleBySlug[c.slug] = c.admin?.useAsTitle
  }

  // v3.22 — grouped mode (`?groupBy=<field>`, `-field` for descending group
  // order). One capped find, grouped in JS (see getGroupedData — findDistinct
  // isn't available on every adapter). Not in trash mode (trash stays flat).
  const groupableFields = getGroupableFields(serializableCollection as any)
  const spAll = searchParams as SearchParams | undefined
  const groupByRaw = !isTrash ? firstString(spAll?.groupBy) : undefined
  const groupByName = groupByRaw ? groupByRaw.replace(/^-/, '') : undefined
  const groupByField = groupByName
    ? groupableFields.find((f) => f.name === groupByName)
    : undefined

  // "Group by" picker (both flat + grouped headers). The active grouping is
  // passed as a server-parsed prop so the trigger label never lags the URL.
  const groupByMenu =
    groupableFields.length > 0 ? (
      <GroupByMenu fields={groupableFields} current={groupByName ?? null} />
    ) : null

  if (groupByName && groupByField) {
    const where = parseWhere(spAll) ?? undefined
    const search = firstString(spAll?.search)
    const rawField = collection.fields.find(
      (f: any) => f.name === groupByName,
    ) as any
    const { groups, totalGroups, capped } = await getGroupedData({
      payload,
      collectionSlug: collectionSlug as string,
      groupByName,
      groupByField: rawField ?? { type: groupByField.type, name: groupByName },
      sortDesc: groupByRaw!.startsWith('-'),
      where,
      search,
      trash: false,
      locale: serverProps.locale?.code,
      user: serverProps.user,
      useAsTitleBySlug,
      noValueLabel: t?.('general:noValue') ?? 'No value',
    })
    // Pre-render native cells across every group's rows (rowIds are unique).
    const groupedDocs = groups.flatMap((g) => g.rows)
    const { fieldNames: nativeCellFieldNames, byRow: nativeCellsByRow } =
      renderNativeCells({
        collection: collection as any,
        extractedFields: (serializableCollection as any).fields ?? [],
        columnNames: pickFieldNames(serializableCollection as any),
        docs: groupedDocs as Array<{ id: number | string; [k: string]: unknown }>,
        payload,
        i18n: serverProps.i18n,
        collectionSlug: collectionSlug as string,
        viewType,
      })
    const title = pluralLabel(collection as any)
    return (
      <ViewShell
        breadcrumbs={[{ label: title }]}
        headerActions={
          <div className="flex items-center gap-2">
            {foldersEnabled ? (
              <FolderListToggle basePath={listBasePath} mode="list" />
            ) : null}
            {groupByMenu}
          </div>
        }
      >
        <GroupedListView
          collectionSlug={collectionSlug as string}
          collection={serializableCollection as any}
          useAsTitleBySlug={useAsTitleBySlug}
          nativeCellFieldNames={nativeCellFieldNames}
          nativeCellsByRow={nativeCellsByRow}
          groups={groups}
          groupByLabel={groupByField.label}
          totalGroups={totalGroups}
          capped={capped}
        />
      </ViewShell>
    )
  }

  let paginated = serverProps.data as
    | PaginatedDocs<{ id: number | string }>
    | undefined

  if (collectionNeedsDepthOne(serializableCollection as any)) {
    const sp = searchParams as SearchParams | undefined
    const page = toInt(sp?.page, 1)
    const limitParam = toInt(sp?.limit, limit ?? DEFAULT_PAGE_SIZE)
    const sort = firstString(sp?.sort)
    const search = firstString(sp?.search)
    const parsedWhere = parseWhere(sp)
    // In trash mode this refetch must mirror renderListView's trash handling:
    // pass `trash: true` AND constrain to docs with a `deletedAt` set. Without
    // this, a collection with relationships (depth:1 path) would show live docs
    // on the trash route.
    const where = isTrash
      ? {
          and: [
            ...(parsedWhere ? [parsedWhere] : []),
            { deletedAt: { exists: true } },
          ],
        }
      : parsedWhere
    const select = buildListSelect(serializableCollection as any)
    const populate = buildListPopulate(
      serializableCollection as any,
      useAsTitleBySlug,
    )

    try {
      paginated = (await payload.find({
        collection: collectionSlug as any,
        depth: 1,
        page,
        limit: limitParam,
        ...(sort ? { sort } : {}),
        ...(where ? { where } : {}),
        ...(search ? { search } : {}),
        ...(isTrash ? { trash: true } : {}),
        ...(serverProps.locale?.code ? { locale: serverProps.locale.code } : {}),
        select,
        ...(populate ? { populate } : {}),
        user: serverProps.user,
        overrideAccess: false,
      })) as unknown as PaginatedDocs<{ id: number | string }>
    } catch (err) {
      payload.logger?.error?.({
        msg: 'AutoCollectionListView: depth:1 refetch failed, falling back to serverProps.data',
        err,
      })
    }
  }

  const docs = paginated?.docs ?? []

  // v3.20 — pre-render any Payload-native `field.admin.components.Cell` for the
  // visible columns, server-side, via Payload's own RenderServerComponent. The
  // resulting per-row nodes are threaded to the client column builder, which
  // looks them up instead of using the built-in renderer. Plugin `.cell`
  // overrides still win (resolved client-side in buildColumnsForCollection).
  const { fieldNames: nativeCellFieldNames, byRow: nativeCellsByRow } =
    renderNativeCells({
      collection: collection as any,
      extractedFields: (serializableCollection as any).fields ?? [],
      columnNames: pickFieldNames(serializableCollection as any),
      docs: docs as Array<{ id: number | string; [k: string]: unknown }>,
      payload,
      i18n: serverProps.i18n,
      collectionSlug: collectionSlug as string,
      viewType,
    })

  const useAsTitle = collection.admin?.useAsTitle
  const listSearchableFields = collection.admin?.listSearchableFields
  const searchEnabled = Boolean(
    useAsTitle ||
      (Array.isArray(listSearchableFields) && listSearchableFields.length > 0),
  )
  const title = pluralLabel(collection as any)
  const trashLabel = t?.('general:trash') ?? 'Trash'
  const breadcrumbs = isTrash
    ? [
        { label: title, href: `/admin/collections/${collectionSlug}` },
        { label: trashLabel },
      ]
    : [{ label: title }]
  const emptyMessage = isTrash
    ? t?.('general:noTrashResults', { label: title }) ?? `No ${title} in trash.`
    : undefined

  // Folder toggle + group-by picker (group-by hidden in trash mode, where
  // `groupByMenu` would still render — gate it on !isTrash here).
  const folderToggle =
    foldersEnabled && !isTrash ? (
      <FolderListToggle basePath={listBasePath} mode="list" />
    ) : null
  const listGroupByMenu = !isTrash ? groupByMenu : null
  const listHeaderActions =
    folderToggle || listGroupByMenu ? (
      <div className="flex items-center gap-2">
        {folderToggle}
        {listGroupByMenu}
      </div>
    ) : undefined

  return (
    <ViewShell breadcrumbs={breadcrumbs} headerActions={listHeaderActions}>
      <AutoColumnsBridge
        collection={serializableCollection as any}
        useAsTitleBySlug={useAsTitleBySlug}
        nativeCellFieldNames={nativeCellFieldNames}
        nativeCellsByRow={nativeCellsByRow}
        collectionSlug={collectionSlug}
        data={docs as any}
        pageCount={paginated?.totalPages ?? 1}
        rowCount={paginated?.totalDocs ?? 0}
        defaultPageSize={limit ?? DEFAULT_PAGE_SIZE}
        newDocumentURL={newDocumentURL ?? ''}
        enableSearch={searchEnabled}
        enableBulkDelete={Boolean(hasDeletePermission)}
        enableCreate={isTrash ? false : Boolean(hasCreatePermission)}
        isTrash={isTrash}
        trashEnabled={Boolean((collection as any).trash)}
        hasTrashPermission={Boolean(hasTrashPermission)}
        emptyMessage={emptyMessage}
      />
    </ViewShell>
  )
}

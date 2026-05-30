import type { Payload, TypedUser } from '../../internal/payloadAdapter.js'

import type { FolderBreadcrumb, FolderItem } from './FolderBrowserClient.js'

type Args = {
  payload: Payload
  user?: TypedUser
  locale?: string
  collectionSlug: string
  foldersSlug: string
  folderFieldName: string
  folderID: number | string | null
  useAsTitle?: string
  isUpload?: boolean
}

/* Per-collection folder data, scoped to one collection. AutoCollectionListView
   runs in a list-view context that has no `req`, so we can't use Payload's
   `getFolderData` (which requires one). This mirrors its output shape
   (`{ breadcrumbs, subfolders, documents }` in FolderItem form) using direct
   `payload.find` with the request user + `overrideAccess: false`. Subfolders
   are the shared folder tree; documents are scoped to `collectionSlug`. */
export async function getCollectionFolderData({
  payload,
  user,
  locale,
  collectionSlug,
  foldersSlug,
  folderFieldName,
  folderID,
  useAsTitle,
  isUpload,
}: Args): Promise<{
  breadcrumbs: FolderBreadcrumb[]
  subfolders: FolderItem[]
  documents: FolderItem[]
}> {
  const folderConstraint =
    folderID != null
      ? { [folderFieldName]: { equals: folderID } }
      : { [folderFieldName]: { exists: false } }

  const common = {
    depth: 0,
    user,
    overrideAccess: false,
    ...(locale ? { locale } : {}),
    limit: 0,
  } as const

  const [folderRes, docRes] = await Promise.all([
    payload.find({
      collection: foldersSlug as never,
      where: folderConstraint as never,
      sort: 'name',
      ...common,
    }),
    payload.find({
      collection: collectionSlug as never,
      where: folderConstraint as never,
      ...common,
    }),
  ])

  const subfolders: FolderItem[] = folderRes.docs.map((doc: any) => ({
    itemKey: `${foldersSlug}-${doc.id}`,
    relationTo: foldersSlug,
    value: { id: doc.id, _folderOrDocumentTitle: String(doc.name ?? doc.id) },
  }))

  const documents: FolderItem[] = docRes.docs.map((doc: any) => ({
    itemKey: `${collectionSlug}-${doc.id}`,
    relationTo: collectionSlug,
    value: {
      id: doc.id,
      _folderOrDocumentTitle: String(
        (useAsTitle && doc[useAsTitle]) || doc.filename || doc.id,
      ),
      ...(isUpload
        ? { filename: doc.filename, url: doc.thumbnailURL || doc.url }
        : {}),
    },
  }))

  const breadcrumbs = await buildBreadcrumbs({
    payload,
    user,
    locale,
    foldersSlug,
    folderFieldName,
    folderID,
  })

  return { breadcrumbs, subfolders, documents }
}

async function buildBreadcrumbs({
  payload,
  user,
  locale,
  foldersSlug,
  folderFieldName,
  folderID,
}: {
  payload: Payload
  user?: TypedUser
  locale?: string
  foldersSlug: string
  folderFieldName: string
  folderID: number | string | null
}): Promise<FolderBreadcrumb[]> {
  const crumbs: FolderBreadcrumb[] = []
  let id: number | string | null = folderID
  let guard = 0
  while (id != null && guard++ < 20) {
    let folder: any
    try {
      folder = await payload.findByID({
        collection: foldersSlug as never,
        id,
        depth: 0,
        user,
        overrideAccess: false,
        ...(locale ? { locale } : {}),
      })
    } catch {
      break
    }
    if (!folder) break
    crumbs.unshift({ id: folder.id, name: String(folder.name ?? folder.id) })
    const parent = folder[folderFieldName]
    id = parent && typeof parent === 'object' ? parent.id : parent ?? null
  }
  return crumbs
}

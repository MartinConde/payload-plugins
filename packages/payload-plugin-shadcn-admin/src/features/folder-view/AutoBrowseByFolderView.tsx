import type { AdminViewServerProps } from '../../internal/payloadAdapter.js'
import type { TFunction } from '../../internal/payloadAdapter.js'

import { getFolderData } from '../../internal/payloadAdapter.js'

import type { ShadcnAdminTranslationsKeys } from '../../translations.js'
import { ViewShell } from 'payload-plugin-shadcn-ui'
import { FolderBrowserClient } from './FolderBrowserClient.js'

const firstString = (v: unknown): string | undefined =>
  Array.isArray(v) ? (typeof v[0] === 'string' ? v[0] : undefined) : typeof v === 'string' ? v : undefined

/* RSC installed at `admin.components.views.browseByFolder` by the
   `defaultFolderView` plugin option. The router's custom-view lookup resolves
   this before Payload's default `BrowseByFolder` builder runs (same mechanism
   as the `account` override), so it fully replaces the cross-collection folder
   browser. Folder navigation uses a `?folderID=` query param (NOT the
   `/browse-by-folder/:folderID` path, which is hardcoded to Payload's view), so
   our component always renders. Mounted as
   `payload-plugin-shadcn-admin/rsc#AutoBrowseByFolderView`. */
export async function AutoBrowseByFolderView(serverProps: AdminViewServerProps) {
  const { initPageResult, searchParams } = serverProps
  const { req } = initPageResult
  const { i18n, payload } = req
  const { config } = payload

  if (!config.folders) {
    const tt = i18n.t as TFunction<ShadcnAdminTranslationsKeys>
    return (
      <ViewShell breadcrumbs={[{ label: i18n.t('folder:folders') }]}>
        <p className="text-muted-foreground">
          {tt('shadcnAdmin:foldersNotEnabled')}
        </p>
      </ViewShell>
    )
  }

  const adminRoute = config.routes.admin || '/admin'
  const browsePath = config.admin?.routes?.browseByFolder || '/browse-by-folder'
  const basePath = `${adminRoute === '/' ? '' : adminRoute}${browsePath}`
  const folderID = firstString(searchParams?.folderID) ?? null
  const rootLabel = i18n.t('folder:browseByFolder')

  const { breadcrumbs, documents, subfolders } = await getFolderData({
    folderID: folderID ?? undefined,
    req,
    sort: 'name',
  })

  return (
    <ViewShell
      breadcrumbs={[{ label: rootLabel }]}
      contentClassName="p-6"
    >
      <FolderBrowserClient
        basePath={basePath}
        adminRoute={adminRoute === '/' ? '' : adminRoute}
        foldersSlug={config.folders.slug}
        folderFieldName={config.folders.fieldName}
        currentFolderID={folderID}
        breadcrumbs={breadcrumbs as { id: number | string; name: string }[]}
        subfolders={subfolders as never}
        documents={documents as never}
        rootLabel={rootLabel}
      />
    </ViewShell>
  )
}

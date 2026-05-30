import type { DocumentViewServerProps } from '../../../internal/payloadAdapter.js'

import { ViewShell } from 'payload-plugin-shadcn-ui'
import { stringifyLabel } from 'payload-plugin-shadcn-ui'
import { DocViewTabs } from '../DocViewTabs.js'
import { ApiInspector } from './ApiInspector.js'

const titleCase = (slug: string): string =>
  slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/* API view, installed at `admin.components.views.edit.api` by the plugin for
   any collection it owns (gated the same as the default edit view). Renders the
   shadcn doc-view chrome (ViewShell + DocViewTabs) around the client-side
   ApiInspector, which does the live JSON fetch. Mounted as
   `payload-plugin-shadcn-admin/rsc#AutoApiView`. */
export async function AutoApiView(serverProps: DocumentViewServerProps) {
  const { initPageResult } = serverProps
  const collection = initPageResult?.collectionConfig
  const global = initPageResult?.globalConfig
  const isGlobal = Boolean(global) && !collection

  // Globals: singleton API view (`/admin/globals/{slug}/api`). ApiInspector is
  // already global-aware (branches on globalSlug → `/globals/{slug}`), so the
  // RSC only needs to mount the shadcn chrome with global breadcrumbs.
  if (isGlobal) {
    const globalSlug = global!.slug
    const label = stringifyLabel((global as any).label) ?? titleCase(globalSlug)
    return (
      <ViewShell
        className="shadcn-auto-doc-view"
        headerActions={
          <DocViewTabs active="api" hasVersions={Boolean(global!.versions)} />
        }
        breadcrumbs={[
          { label: 'Globals' },
          { label, href: `/admin/globals/${globalSlug}` },
          { label: 'API' },
        ]}
      >
        <ApiInspector />
      </ViewShell>
    )
  }

  const collectionSlug = collection?.slug
  const docID = initPageResult?.docID

  if (!collection || !collectionSlug || docID === undefined) {
    return (
      <ViewShell breadcrumbs={[{ label: 'API' }]}>
        <p className="text-muted-foreground">Could not resolve document.</p>
      </ViewShell>
    )
  }

  const useAsTitle = collection.admin?.useAsTitle
  const doc = serverProps.doc as Record<string, unknown> | undefined
  const editTitle =
    useAsTitle && doc && typeof doc[useAsTitle] === 'string'
      ? String(doc[useAsTitle])
      : String(docID)

  const pluralLabel =
    stringifyLabel((collection as any).labels?.plural) ?? titleCase(collectionSlug)
  const basePath = `/admin/collections/${collectionSlug}/${docID}`

  return (
    <ViewShell
      className="shadcn-auto-doc-view"
      headerActions={
        <DocViewTabs active="api" hasVersions={Boolean(collection.versions)} />
      }
      breadcrumbs={[
        { label: 'Collections' },
        { label: pluralLabel, href: `/admin/collections/${collectionSlug}` },
        { label: editTitle, href: basePath },
        { label: 'API' },
      ]}
    >
      <ApiInspector />
    </ViewShell>
  )
}

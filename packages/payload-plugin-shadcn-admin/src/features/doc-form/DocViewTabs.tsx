'use client'

import * as React from 'react'
import { useDocumentInfo, useTranslation } from '../../internal/payloadAdapter.js'

import { Badge } from 'payload-plugin-shadcn-ui'
import { buttonVariants } from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'

/* Restyled replacement for Payload's default DocumentHeader tabs
   (Edit / Versions / API). Rendered right-aligned in the shadcn top bar via
   ViewHeader's `actions` slot. Payload's own `.doc-header` is hidden by a
   route-scoped CSS rule in styles.css (`.shadcn-auto-doc-view` marker).

   Hrefs use the `/admin` prefix to match AutoCollectionDocView's breadcrumbs.
   Works for both collections (`/admin/collections/{slug}/{id}`) and globals
   (`/admin/globals/{slug}` — singletons have no id). The `active` prop marks
   which tab is current: the edit view passes nothing (defaults to 'edit'); the
   versions list + diff views pass 'versions'. `hasVersions` gates the Versions
   tab — non-versioned entities have no version routes, so the tab is hidden
   (the RSC passes `Boolean(config.versions)`). */
export function DocViewTabs({
  active = 'edit',
  hasVersions = true,
}: {
  active?: 'edit' | 'versions' | 'api'
  hasVersions?: boolean
} = {}) {
  const { t } = useTranslation()
  const { id, collectionSlug, globalSlug, versionCount } = useDocumentInfo()

  let base: string
  if (globalSlug) {
    base = `/admin/globals/${globalSlug}`
  } else if (collectionSlug && id !== undefined && id !== null) {
    base = `/admin/collections/${collectionSlug}/${id}`
  } else {
    return null
  }

  const tab = cn(
    buttonVariants({ variant: 'ghost', size: 'sm' }),
    'text-muted-foreground hover:text-foreground',
  )
  const activeTab = cn(buttonVariants({ variant: 'secondary', size: 'sm' }))
  const classFor = (key: 'edit' | 'versions' | 'api') =>
    key === active ? activeTab : tab
  const currentFor = (key: 'edit' | 'versions' | 'api') =>
    key === active ? ('page' as const) : undefined

  return (
    <nav className="ml-auto flex items-center gap-1" aria-label="Document views">
      <a href={base} className={classFor('edit')} aria-current={currentFor('edit')}>
        {t('general:edit')}
      </a>
      {hasVersions ? (
        <a
          href={`${base}/versions`}
          className={classFor('versions')}
          aria-current={currentFor('versions')}
        >
          {t('version:versions')}
          {typeof versionCount === 'number' && versionCount > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {versionCount}
            </Badge>
          )}
        </a>
      ) : null}
      <a
        href={`${base}/api`}
        className={classFor('api')}
        aria-current={currentFor('api')}
      >
        API
      </a>
    </nav>
  )
}

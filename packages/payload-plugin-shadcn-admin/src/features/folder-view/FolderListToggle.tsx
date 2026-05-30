'use client'

import * as React from 'react'
import Link from 'next/link'
import { LayoutList, FolderTree } from 'lucide-react'
import { useTranslation } from '../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../translations.js'
import { Button } from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'

/* List ⇄ Folders toggle rendered in the auto list view's header. Flips a
   `?view=folders` query param that AutoCollectionListView branches on — it
   deliberately does NOT set Payload's `listViewType` preference, which would
   route `/collections/:slug` to Payload's hardcoded (non-overridable) folder
   view instead of ours. */
export function FolderListToggle({
  basePath,
  mode,
}: {
  basePath: string
  mode: 'list' | 'folders'
}) {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      <Button
        asChild
        size="sm"
        variant={mode === 'list' ? 'secondary' : 'ghost'}
        className={cn('rounded-none border-0')}
      >
        <Link href={basePath} aria-current={mode === 'list'}>
          <LayoutList className="mr-2 h-4 w-4" />
          {t('shadcnAdmin:listView')}
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        variant={mode === 'folders' ? 'secondary' : 'ghost'}
        className={cn('rounded-none border-0')}
      >
        <Link href={`${basePath}?view=folders`} aria-current={mode === 'folders'}>
          <FolderTree className="mr-2 h-4 w-4" />
          {t('folder:folders')}
        </Link>
      </Button>
    </div>
  )
}

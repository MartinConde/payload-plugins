'use client'

/* v3.23 — shared toolbar for the grouped list view: search + create, sitting
   above the per-group tables in GroupedListView. Deliberately thin — no
   bulk-select or pagination here, same tradeoff GroupedListView's own comment
   documents for the per-group tables (a selection model spanning groups, or
   real pagination over getGroupedData's capped fetch, is a bigger lift than
   "bring to parity" calls for). The existing "capped sample" messaging is the
   substitute for pagination in grouped mode.

   Search writes `?search=` directly off `window.location.search` (like
   GroupByMenu) rather than through `useSearchParams()`/`useDataTableUrlState`
   — that hook's state (PaginationState/SortingState) doesn't apply to the
   grouped view, and GroupByMenu already established the direct-URL pattern
   here to avoid a stale read on a freshly-mounted component.

   Clearing writes `search=''` rather than deleting the key. Payload's own
   ListQueryProvider (from @payloadcms/ui) still wraps this custom list view
   and tracks `search` as one of its synced fields; its `sanitizeQuery`
   explicitly deletes a key only when the incoming value is the empty string
   (that's its documented convention for "this preference should now be
   cleared" — see its own comment: "Once cleared, they are no longer needed in
   the URL"). Simply omitting the key from our pushed URL leaves Payload's
   client-side copy of the previous value in place, and it gets silently
   merged back in on the next render — deleting never actually clears it. */

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, SearchIcon } from 'lucide-react'
import {
  useListDrawerContext,
  useTranslation,
} from '../../../internal/payloadAdapterUI.js'
import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Button, buttonVariants, cn, Input } from 'payload-plugin-shadcn-ui'

export function GroupedListToolbar({
  newDocumentURL,
  enableCreate,
  enableSearch,
  initialSearch,
  searchPlaceholder,
  searchDebounceMs = 300,
}: {
  newDocumentURL: string
  enableCreate: boolean
  enableSearch: boolean
  initialSearch: string
  searchPlaceholder?: string
  searchDebounceMs?: number
}): React.ReactElement | null {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const router = useRouter()
  const pathname = usePathname()
  // Same drawer-awareness as CollectionListViewClient's create button: inside
  // Payload's "select existing" drawer, create opens the drawer's own nested
  // DocumentDrawer instead of navigating to `newDocumentURL`.
  const {
    isInDrawer,
    allowCreate: drawerAllowCreate,
    DocumentDrawerToggler,
  } = useListDrawerContext()

  const [localSearch, setLocalSearch] = React.useState(initialSearch)
  React.useEffect(() => {
    setLocalSearch(initialSearch)
  }, [initialSearch])
  React.useEffect(() => {
    if (localSearch === initialSearch) return
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      // Always `set`, even to '' — see the file-level comment on why deleting
      // the key doesn't durably clear it.
      params.set('search', localSearch)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, searchDebounceMs)
    return () => clearTimeout(timeout)
  }, [localSearch, initialSearch, pathname, router, searchDebounceMs])

  const createButton = (() => {
    if (isInDrawer) {
      if (!enableCreate || drawerAllowCreate === false || !DocumentDrawerToggler)
        return null
      return (
        <DocumentDrawerToggler className={cn(buttonVariants({ size: 'sm' }))}>
          <Plus className="mr-2 h-4 w-4" />
          {t('general:createNew')}
        </DocumentDrawerToggler>
      )
    }
    return enableCreate ? (
      <Button asChild size="sm">
        <Link href={newDocumentURL}>
          <Plus className="mr-2 h-4 w-4" />
          {t('general:createNew')}
        </Link>
      </Button>
    ) : null
  })()

  if (!enableSearch && !createButton) return null

  return (
    <div className="flex items-center gap-2">
      {enableSearch ? (
        <div className="relative w-full max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder ?? t('shadcnAdmin:searchPlaceholder')}
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            className="h-8 pl-8"
          />
        </div>
      ) : null}
      {createButton ? <div className="ml-auto">{createButton}</div> : null}
    </div>
  )
}

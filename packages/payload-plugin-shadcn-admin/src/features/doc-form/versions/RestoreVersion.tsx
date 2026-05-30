'use client'

/* Restore controls for the version diff view. POSTs to Payload's restoreVersion
   endpoint — `/api/{slug}/versions/{versionId}` for collections,
   `/api/globals/{slug}/versions/{versionId}` for globals; `?draft=true` restores
   as a draft instead of publishing. On success, returns the user to the doc edit
   view. Lifts the restore logic out of the old VersionsDialog. v3.9. */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LoaderIcon, RotateCcwIcon } from 'lucide-react'
import { useTranslation } from '../../../internal/payloadAdapter.js'

import { Button } from 'payload-plugin-shadcn-ui'

export type RestoreVersionProps = {
  /** Set for collection version restores. Mutually exclusive with globalSlug. */
  collectionSlug?: string
  /** Set for global version restores → `/api/globals/{slug}/versions/{id}`. */
  globalSlug?: string
  versionId: string
  /** `/admin/collections/{slug}/{id}` or `/admin/globals/{slug}` — where to
   *  land after a restore. */
  basePath: string
  /** When true (drafts enabled), also offer "Restore as draft". */
  draftsEnabled: boolean
}

export function RestoreVersion({
  collectionSlug,
  globalSlug,
  versionId,
  basePath,
  draftsEnabled,
}: RestoreVersionProps): React.ReactElement {
  const { t } = useTranslation()
  const router = useRouter()
  const [pending, setPending] = React.useState<null | 'publish' | 'draft'>(null)
  const [error, setError] = React.useState<string | null>(null)

  const restoreBase = globalSlug
    ? `/api/globals/${globalSlug}/versions/${versionId}`
    : `/api/${collectionSlug}/versions/${versionId}`

  const restore = async (asDraft: boolean) => {
    setPending(asDraft ? 'draft' : 'publish')
    setError(null)
    try {
      const qs = asDraft ? '?draft=true' : ''
      const res = await fetch(
        `${restoreBase}${qs}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
      )
      if (!res.ok) {
        setError(t('version:problemRestoringVersion'))
        return
      }
      router.push(basePath)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('version:problemRestoringVersion'),
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span className="text-sm text-destructive">{error}</span>
      ) : null}
      {draftsEnabled ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => void restore(true)}
        >
          {pending === 'draft' ? (
            <LoaderIcon className="size-3.5 animate-spin" />
          ) : (
            <RotateCcwIcon className="size-3.5" />
          )}
          <span className="ml-1">{t('version:restoreAsDraft')}</span>
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={pending !== null}
        onClick={() => void restore(false)}
      >
        {pending === 'publish' ? (
          <LoaderIcon className="size-3.5 animate-spin" />
        ) : (
          <RotateCcwIcon className="size-3.5" />
        )}
        <span className="ml-1">{t('version:restoreThisVersion')}</span>
      </Button>
    </div>
  )
}

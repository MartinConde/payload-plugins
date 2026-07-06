'use client'

/* The bulk-edit sheet's review step: a diff list of picked-field → new-value,
   resolving relationship/upload ids to their `useAsTitle` for readability.
   Split out of BulkEditSheet.tsx, which owns the picked-field state and value
   shim this renders. */

import * as React from 'react'
import { useTranslation } from '../../../internal/payloadAdapterUI.js'
import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import type { ExtractedField } from 'payload-plugin-shadcn-ui'
import { getByPath, isObject } from '../../doc-form/fieldTree/sharedHelpers.js'
import type { PickableField } from './bulkEditLeaves.js'

export const formatDiffValue = (value: unknown): string => {
  if (value === null) return '∅ (null)'
  if (value === undefined) return '(empty)'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return `${value.length} item${value.length === 1 ? '' : 's'}`
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ReviewList({
  pickedPaths,
  leafByPath,
  projected,
  count,
  useAsTitleBySlug,
}: {
  pickedPaths: string[]
  leafByPath: Map<string, PickableField>
  projected: Record<string, unknown>
  count: number
  useAsTitleBySlug: Record<string, string | undefined>
}): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  if (pickedPaths.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('shadcnAdmin:noChangesToApply')}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t('shadcnAdmin:changesApplyIntro', { count })}
      </p>
      <dl className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
        {pickedPaths.map((path) => {
          const leaf = leafByPath.get(path)
          return (
            <div
              key={path}
              className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-start sm:gap-3"
            >
              <dt className="font-medium text-foreground sm:w-40 sm:shrink-0">
                {leaf?.label ?? path}
              </dt>
              <dd className="break-words text-muted-foreground">
                <ReviewValue
                  field={leaf?.field}
                  value={getByPath(projected, path)}
                  useAsTitleBySlug={useAsTitleBySlug}
                />
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

type RefEntry = { slug: string; id: string | number }

/* Normalize a relationship/upload value into a flat list of {slug, id}, across
   single / hasMany / polymorphic-envelope shapes. */
const toRefEntries = (
  value: unknown,
  relationTo: string | string[] | undefined,
): RefEntry[] => {
  const single = (v: unknown): RefEntry | null => {
    if (v === null || v === undefined) return null
    if (isObject(v) && 'value' in v && typeof v.relationTo === 'string') {
      const id = v.value
      if (typeof id === 'string' || typeof id === 'number')
        return { slug: v.relationTo, id }
      return null
    }
    if (typeof v === 'string' || typeof v === 'number') {
      const slug = Array.isArray(relationTo) ? relationTo[0] : relationTo
      return slug ? { slug, id: v } : null
    }
    return null
  }
  const arr = Array.isArray(value) ? value : [value]
  return arr.map(single).filter((e): e is RefEntry => e !== null)
}

/* Review-step value renderer. Relationship/upload fields resolve their ids to
   the related doc's `useAsTitle` (falling back to the id); other types use
   formatDiffValue. */
function ReviewValue({
  field,
  value,
  useAsTitleBySlug,
}: {
  field: ExtractedField | undefined
  value: unknown
  useAsTitleBySlug: Record<string, string | undefined>
}): React.ReactElement {
  const isRef = field?.type === 'relationship' || field?.type === 'upload'
  const entries = React.useMemo(
    () => (isRef ? toRefEntries(value, field?.relationTo) : []),
    [isRef, value, field?.relationTo],
  )
  const [titles, setTitles] = React.useState<Record<string, string>>({})
  const key = entries.map((e) => `${e.slug}:${e.id}`).join(',')

  React.useEffect(() => {
    if (entries.length === 0) return
    let cancelled = false
    const bySlug = new Map<string, (string | number)[]>()
    for (const e of entries) {
      const list = bySlug.get(e.slug) ?? []
      list.push(e.id)
      bySlug.set(e.slug, list)
    }
    void (async () => {
      const next: Record<string, string> = {}
      await Promise.all(
        Array.from(bySlug.entries()).map(async ([slug, ids]) => {
          const useAsTitle = useAsTitleBySlug[slug]
          const params = new URLSearchParams()
          params.set('depth', '0')
          params.set('limit', String(ids.length))
          ids.forEach((id) => params.append('where[id][in][]', String(id)))
          try {
            const res = await fetch(`/api/${slug}?${params.toString()}`, {
              credentials: 'include',
            })
            if (!res.ok) return
            const body = (await res.json()) as { docs?: Record<string, unknown>[] }
            for (const d of body.docs ?? []) {
              const t = useAsTitle ? d[useAsTitle] : undefined
              next[`${slug}:${String(d.id)}`] =
                typeof t === 'string' && t.length > 0 ? t : String(d.id)
            }
          } catch {
            // leave unresolved → falls back to id
          }
        }),
      )
      if (!cancelled) setTitles(next)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!isRef) return <>{formatDiffValue(value)}</>
  if (entries.length === 0) return <>{formatDiffValue(value)}</>
  return (
    <>
      {entries
        .map((e) => titles[`${e.slug}:${e.id}`] ?? String(e.id))
        .join(', ')}
    </>
  )
}

/* v3.22 — server-side group-by data. No React here — the RSC calls this and
   hands the result to the client `GroupedListView`.

   NOTE: an earlier version used `payload.findDistinct` (mirroring
   @payloadcms/next's `handleGroupBy`), but that operation isn't implemented by
   every DB adapter — `@payloadcms/db-d1-sqlite` (this starter) throws
   `payload.db.findDistinct is not a function`. So instead we do ONE capped
   `payload.find` (filter + search + locale applied) and group the returned docs
   in JS. Adapter-agnostic, and a single query.

   Constraints (also documented in SETUP §7b "Group by"):
   - GROUP_FETCH_CAP caps how many docs we pull for grouping; `capped` is set
     when the collection has more (the view shows a "first N of M docs" note).
   - GROUP_CAP caps how many groups render (high-cardinality fields would else
     be a wall of sparse tables); extra groups are dropped from the tail.
   - Counts/rows are within the fetched window (no per-group pagination v1).
   - filter `where` + `search` + `locale` all thread into the one find. */

import type { ListViewServerProps, Where } from '../../../internal/payloadAdapter.js'
import type { FieldMeta } from '../columns/fieldPicker.js'

/** Max groups rendered. */
export const GROUP_CAP = 50
/** Max docs pulled for grouping (one query). */
export const GROUP_FETCH_CAP = 500

export type GroupData = {
  /** Stable key for React + per-group table. */
  key: string
  /** Display heading (resolved relationship title / formatted date / etc.). */
  heading: string
  count: number
  rows: Array<{ id: number | string; [k: string]: unknown }>
}

export type GroupedResult = {
  groups: GroupData[]
  /** Total distinct groups found in the fetched window (for the note). */
  totalGroups: number
  /** True when the collection has more docs than we fetched, OR more groups
   *  than GROUP_CAP — i.e. the view is showing a partial picture. */
  capped: boolean
}

const extractRelationshipID = (value: unknown): unknown => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return (value as { id?: unknown }).id ?? value
  }
  return value
}

const formatDate = (value: unknown): string => {
  const d = new Date(value as string | number | Date)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

const NULL_KEY = '__null__'

export async function getGroupedData({
  payload,
  collectionSlug,
  groupByName,
  groupByField,
  sortDesc,
  where,
  search,
  trash,
  locale,
  user,
  useAsTitleBySlug,
  noValueLabel,
}: {
  payload: ListViewServerProps['payload']
  collectionSlug: string
  groupByName: string
  groupByField: FieldMeta
  sortDesc: boolean
  where?: Where
  search?: string
  trash: boolean
  locale?: string
  user: ListViewServerProps['user']
  /** related-slug → useAsTitle, for relationship group headings. */
  useAsTitleBySlug: Record<string, string | undefined>
  noValueLabel: string
}): Promise<GroupedResult> {
  const isRelationship = groupByField.type === 'relationship'
  const relatedSlug =
    isRelationship && typeof groupByField.relationTo === 'string'
      ? groupByField.relationTo
      : undefined

  // One capped fetch with the active filter/search/locale; depth:1 so
  // relationship group values arrive populated (for headings) and cells render.
  const found = (await payload.find({
    collection: collectionSlug as never,
    depth: 1,
    limit: GROUP_FETCH_CAP,
    sort: sortDesc ? `-${groupByName}` : groupByName,
    ...(where ? { where } : {}),
    ...(search ? { search } : {}),
    ...(trash ? { trash: true } : {}),
    ...(locale ? { locale } : {}),
    user,
    overrideAccess: false,
  } as never)) as unknown as {
    docs?: Array<{ id: number | string; [k: string]: unknown }>
    totalDocs?: number
  }

  const docs = found.docs ?? []
  const fetchedAll = (found.totalDocs ?? docs.length) <= docs.length

  // Group in JS, preserving the find's sort order (groups appear in first-seen
  // order, which is the groupBy sort order).
  const order: string[] = []
  const byKey = new Map<
    string,
    { heading: string; rows: GroupData['rows'] }
  >()

  const headingFor = (raw: unknown, isNull: boolean): string => {
    if (isNull) return noValueLabel
    if (isRelationship) {
      const useAsTitle = relatedSlug ? useAsTitleBySlug[relatedSlug] : undefined
      if (raw && typeof raw === 'object' && useAsTitle) {
        const t = (raw as Record<string, unknown>)[useAsTitle]
        if (typeof t === 'string' && t) return t
      }
      return String(extractRelationshipID(raw))
    }
    if (groupByField.type === 'date') return formatDate(raw)
    if (groupByField.type === 'checkbox') return raw ? 'True' : 'False'
    return String(raw)
  }

  for (const doc of docs) {
    const raw = doc[groupByName]
    const isNull = raw === null || raw === undefined
    const key = isNull
      ? NULL_KEY
      : String(isRelationship ? extractRelationshipID(raw) : raw)
    let bucket = byKey.get(key)
    if (!bucket) {
      bucket = { heading: headingFor(raw, isNull), rows: [] }
      byKey.set(key, bucket)
      order.push(key)
    }
    bucket.rows.push(doc)
  }

  const totalGroups = order.length
  const cappedKeys = order.slice(0, GROUP_CAP)
  const groups: GroupData[] = cappedKeys.map((key) => {
    const bucket = byKey.get(key)!
    return {
      key,
      heading: bucket.heading,
      count: bucket.rows.length,
      rows: bucket.rows,
    }
  })

  return {
    groups,
    totalGroups,
    capped: !fetchedAll || totalGroups > GROUP_CAP,
  }
}

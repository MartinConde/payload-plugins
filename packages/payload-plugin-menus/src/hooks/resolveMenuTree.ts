import type { CollectionAfterReadHook } from 'payload'

import type { MenuItemResolved } from '../menuTree.js'
import type { MenuUrlResolver } from '../types.js'

type ResolveOptions = {
  linkableCollections: string[]
  resolveUrl?: MenuUrlResolver
  /** Bypass access control when resolving linked docs. Default false (secure):
   *  docs the viewer can't read resolve to null. See `MenusPluginConfig`. */
  resolveOverrideAccess?: boolean
}

/** Pull a human label off a populated doc, trying the common title fields. */
const labelOf = (doc: Record<string, unknown> | null): string | null => {
  if (!doc) return null
  for (const key of ['title', 'name', 'label']) {
    const v = doc[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

/** Built-in URL strategy, applied when no custom resolver returns a value:
 *  Pages-style `breadcrumbs[last].url`, then a `url` field, then `/{slug}`. */
const builtinUrl = (doc: Record<string, unknown> | null): string | null => {
  if (!doc) return null
  const crumbs = doc.breadcrumbs
  if (Array.isArray(crumbs) && crumbs.length > 0) {
    const last = crumbs[crumbs.length - 1] as Record<string, unknown> | undefined
    if (last && typeof last.url === 'string' && last.url) return last.url
  }
  if (typeof doc.url === 'string' && doc.url) return doc.url
  if (typeof doc.slug === 'string' && doc.slug) return `/${doc.slug}`
  return null
}

/** Walk the tree collecting every document link's id per collection. */
const collectRefs = (
  items: unknown[],
  linkable: Set<string>,
  out: Map<string, Set<string>>,
): void => {
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Record<string, unknown>
    if (item.type !== 'custom') {
      const ref = item.doc as Record<string, unknown> | null | undefined
      const relationTo = ref ? String(ref.relationTo ?? '') : ''
      const id = ref ? String(ref.value ?? '') : ''
      if (relationTo && id && linkable.has(relationTo)) {
        if (!out.has(relationTo)) out.set(relationTo, new Set())
        out.get(relationTo)!.add(id)
      }
    }
    if (Array.isArray(item.children)) collectRefs(item.children, linkable, out)
  }
}

/**
 * Factory for the menus `afterRead` hook. Walks the read tree and attaches a
 * read-only `resolved: { url, label }` to every `type: 'document'` item so the
 * frontend can render links in a single fetch. Custom-URL items get their `url`
 * mirrored into `resolved.url`. Linked docs are batch-fetched with ONE
 * `where[id][in]` query PER COLLECTION (not one per item), at the request's
 * locale; failures resolve to nulls (never throw).
 *
 * Resolution runs with `overrideAccess: false` by default, so a link to a doc
 * the current viewer can't read resolves to null (the frontend hides it) rather
 * than leaking its label/URL. Only the derived `{ url, label }` is ever
 * attached to the tree — never the linked doc itself.
 */
export const resolveMenuTree =
  ({
    linkableCollections,
    resolveUrl,
    resolveOverrideAccess = false,
  }: ResolveOptions): CollectionAfterReadHook =>
  async ({ doc, req }) => {
    const tree = (doc as Record<string, unknown> | undefined)?.tree
    // Only resolve a per-locale array. With `locale: 'all'` the value is a
    // `{ locale: tree }` object — leave it untouched (each locale resolves on
    // its own single-locale read).
    if (!Array.isArray(tree)) return doc

    // 1. Collect every linked id, grouped by collection.
    const linkable = new Set(linkableCollections)
    const refsByCollection = new Map<string, Set<string>>()
    collectRefs(tree, linkable, refsByCollection)

    // 2. One batched query per collection → a nested `collection → id → doc`
    //    map (avoids a flat `${collection}:${id}` key that could collide if a
    //    slug or id ever contained a colon).
    const docs = new Map<string, Map<string, Record<string, unknown> | null>>()
    await Promise.all(
      [...refsByCollection.entries()].map(async ([collection, ids]) => {
        const idList = [...ids]
        const byId = new Map<string, Record<string, unknown> | null>()
        docs.set(collection, byId)
        for (const id of idList) byId.set(id, null) // default
        try {
          const result = await req.payload.find({
            collection,
            where: { id: { in: idList } },
            depth: 0,
            limit: idList.length,
            pagination: false,
            locale: req.locale,
            req,
            // Default false: a doc the viewer can't read resolves to null.
            overrideAccess: resolveOverrideAccess,
          })
          for (const d of result.docs as Array<Record<string, unknown>>) {
            byId.set(String(d.id), d)
          }
        } catch {
          /* leave the defaults (null) — links resolve to null gracefully */
        }
      }),
    )

    // 3. Walk the tree attaching `resolved` from the prefetched map.
    const walk = (items: unknown[]): Record<string, unknown>[] => {
      const out: Record<string, unknown>[] = []
      for (const raw of items) {
        const item = (raw && typeof raw === 'object' ? { ...raw } : {}) as Record<
          string,
          unknown
        >
        let resolved: MenuItemResolved = { url: null, label: null }

        if (item.type === 'custom') {
          resolved = {
            url: typeof item.url === 'string' && item.url ? item.url : null,
            label: typeof item.label === 'string' ? item.label : null,
          }
        } else {
          const ref = item.doc as Record<string, unknown> | null | undefined
          const relationTo = ref ? String(ref.relationTo ?? '') : ''
          const id = ref ? String(ref.value ?? '') : ''
          const linked = docs.get(relationTo)?.get(id) ?? null
          const custom = resolveUrl?.({ relationTo, doc: linked, req })
          resolved = {
            url: (custom ?? builtinUrl(linked)) || null,
            label: labelOf(linked),
          }
        }

        item.resolved = resolved
        if (Array.isArray(item.children)) item.children = walk(item.children)
        out.push(item)
      }
      return out
    }

    ;(doc as Record<string, unknown>).tree = walk(tree)
    return doc
  }

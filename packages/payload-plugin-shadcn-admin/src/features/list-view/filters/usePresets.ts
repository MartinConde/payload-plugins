'use client'

/* Saved filter presets — named snapshots of the where/sort/search URL params
   for a single collection list view.

   Backed by Payload's `payload-preferences` collection under the key
   `collection-list-presets-{slug}`. We talk to the standard collection REST
   endpoints (find → create or PATCH by id) for the same d1-sqlite reasons
   documented in usePreferencesSync.ts — the dedicated upsert route silently
   no-ops on first write under @payloadcms/db-d1-sqlite.

   URL is the source of truth for the *current* filter state. This hook only
   reads it when saving a preset and writes back to it (via router.replace)
   when loading one. We deliberately capture the raw `where[*]` URL key/value
   pairs (not a structured FilterState) so the snapshot covers both the
   where-builder's indexed shape and any per-column flat shape uniformly. */

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const SCHEMA_VERSION = 1
const MAX_PRESETS = 20

export type Preset = {
  id: string
  name: string
  createdAt: number
  where: Array<[string, string]>
  sort: string | null
  search: string | null
}

type StoredValue = {
  schemaVersion: number
  presets: Preset[]
}

const prefKey = (collectionSlug: string): string =>
  `collection-list-presets-${collectionSlug}`

const isWhereKey = (key: string): boolean =>
  key === 'where' || key.startsWith('where[')

const isCapturedKey = (key: string): boolean =>
  isWhereKey(key) || key === 'sort' || key === 'search'

/* Sentinel error codes the UI can branch on without inspecting message text. */
export const PRESET_ERROR = {
  AtLimit: 'PRESET_AT_LIMIT',
  NameExists: 'PRESET_NAME_EXISTS',
  EmptyName: 'PRESET_EMPTY_NAME',
  NotReady: 'PRESET_NOT_READY',
} as const

export class PresetError extends Error {
  code: (typeof PRESET_ERROR)[keyof typeof PRESET_ERROR]
  constructor(code: (typeof PRESET_ERROR)[keyof typeof PRESET_ERROR]) {
    super(code)
    this.code = code
    this.name = 'PresetError'
  }
}

const genId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

type UsePresetsResult = {
  presets: Preset[]
  loaded: boolean
  atLimit: boolean
  savePreset: (
    name: string,
    options?: { overwrite?: boolean },
  ) => Promise<Preset>
  loadPreset: (id: string) => void
  deletePreset: (id: string) => Promise<void>
}

export function usePresets(collectionSlug: string): UsePresetsResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [presets, setPresets] = React.useState<Preset[]>([])
  const [loaded, setLoaded] = React.useState(false)

  /* Cached prefs doc id, shared between mount-time hydration and writes.
     null = unknown (need to find), false = confirmed missing (next write
     should POST), string = existing doc id (next write PATCHes). */
  const prefDocIdRef = React.useRef<string | null | false>(null)

  const key = prefKey(collectionSlug)

  const findPrefDoc = React.useCallback(
    async (
      lookupKey: string,
    ): Promise<{ id: string; value: StoredValue | null } | null> => {
      const params = new URLSearchParams()
      params.set('where[key][equals]', lookupKey)
      params.set('limit', '1')
      params.set('depth', '0')
      try {
        const res = await fetch(
          `/api/payload-preferences?${params.toString()}`,
          { credentials: 'include' },
        )
        if (!res.ok) return null
        const body = (await res.json()) as {
          docs?: Array<{ id: string; value: StoredValue | null }>
        }
        const doc = body.docs?.[0]
        if (!doc) return null
        return { id: String(doc.id), value: doc.value ?? null }
      } catch {
        return null
      }
    },
    [],
  )

  const writePrefDoc = React.useCallback(
    async (lookupKey: string, value: StoredValue): Promise<void> => {
      let id = prefDocIdRef.current
      if (id === null) {
        const found = await findPrefDoc(lookupKey)
        id = found?.id ?? false
        prefDocIdRef.current = id
      }
      try {
        if (id) {
          const res = await fetch(`/api/payload-preferences/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
          })
          if (res.status === 404) prefDocIdRef.current = null
          return
        }
        const res = await fetch('/api/payload-preferences', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: lookupKey, value }),
        })
        if (!res.ok) return
        const body = (await res.json()) as { doc?: { id?: string } }
        if (body.doc?.id) prefDocIdRef.current = String(body.doc.id)
      } catch {
        // Ignore; next write will retry the lookup.
      }
    },
    [findPrefDoc],
  )

  /* Hydrate on mount (per collectionSlug). */
  React.useEffect(() => {
    let cancelled = false
    setLoaded(false)
    prefDocIdRef.current = null
    void (async () => {
      const found = await findPrefDoc(key)
      if (cancelled) return
      prefDocIdRef.current = found?.id ?? false
      const stored = found?.value
      if (
        stored &&
        stored.schemaVersion === SCHEMA_VERSION &&
        Array.isArray(stored.presets)
      ) {
        setPresets(stored.presets)
      } else {
        setPresets([])
      }
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [key, findPrefDoc])

  const savePreset = React.useCallback(
    async (
      rawName: string,
      options?: { overwrite?: boolean },
    ): Promise<Preset> => {
      /* Guard against the hydration race: until `loaded` flips true, our
         in-memory `presets` is the empty initial state, not what the server
         has. Writing now would PATCH the server doc to an array of just the
         new preset and silently destroy whatever else was stored. */
      if (!loaded) throw new PresetError(PRESET_ERROR.NotReady)

      const name = rawName.trim()
      if (!name) throw new PresetError(PRESET_ERROR.EmptyName)

      const existingIdx = presets.findIndex((p) => p.name === name)
      const isOverwrite = existingIdx !== -1
      if (isOverwrite && !options?.overwrite) {
        throw new PresetError(PRESET_ERROR.NameExists)
      }
      if (!isOverwrite && presets.length >= MAX_PRESETS) {
        throw new PresetError(PRESET_ERROR.AtLimit)
      }

      const where: Array<[string, string]> = []
      let sort: string | null = null
      let search: string | null = null
      searchParams.forEach((value, paramKey) => {
        if (isWhereKey(paramKey)) {
          where.push([paramKey, value])
        } else if (paramKey === 'sort') {
          sort = value
        } else if (paramKey === 'search') {
          search = value
        }
      })

      const preset: Preset = {
        id: isOverwrite ? presets[existingIdx]!.id : genId(),
        name,
        createdAt: isOverwrite ? presets[existingIdx]!.createdAt : Date.now(),
        where,
        sort,
        search,
      }

      const next = isOverwrite
        ? presets.map((p, i) => (i === existingIdx ? preset : p))
        : [...presets, preset]

      setPresets(next)
      await writePrefDoc(key, {
        schemaVersion: SCHEMA_VERSION,
        presets: next,
      })
      return preset
    },
    [loaded, presets, searchParams, key, writePrefDoc],
  )

  const loadPreset = React.useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id)
      if (!preset) return
      const params = new URLSearchParams(searchParams.toString())
      /* Drop everything we own: any where[*] key, sort, search, page.
         page resets so loading a preset starts from page 1. limit is left
         alone because it's a viewing preference, not part of the snapshot. */
      const toDelete: string[] = []
      params.forEach((_, k) => {
        if (isCapturedKey(k) || k === 'page') toDelete.push(k)
      })
      for (const k of toDelete) params.delete(k)
      for (const [k, v] of preset.where) params.append(k, v)
      if (preset.sort !== null) params.set('sort', preset.sort)
      if (preset.search !== null) params.set('search', preset.search)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [presets, searchParams, router, pathname],
  )

  const deletePreset = React.useCallback(
    async (id: string) => {
      const next = presets.filter((p) => p.id !== id)
      if (next.length === presets.length) return
      setPresets(next)
      await writePrefDoc(key, {
        schemaVersion: SCHEMA_VERSION,
        presets: next,
      })
    },
    [presets, key, writePrefDoc],
  )

  return {
    presets,
    loaded,
    atLimit: presets.length >= MAX_PRESETS,
    savePreset,
    loadPreset,
    deletePreset,
  }
}

'use client'

/* Persists the dashboard's widget layout (order, size, hidden) to Payload's
   preferences API. Mirrors useColumnPrefs's REST flow (find → create | patch)
   and doc-id caching so we don't hit the d1-sqlite upsert no-op (see
   usePreferencesSync.ts for the full explanation of why we talk to the
   `payload-preferences` collection routes directly instead of the dedicated
   upsert endpoint / `usePreferences` hook).

   Preference shape: { schemaVersion: 2, order: string[], hidden: string[],
   sizes: Record<string, DashboardWidgetSize> }. All three are keyed by widget
   id; reconciling them against the current widget set (new widgets appended
   to `order`, removed ones dropped) is the caller's job (DashboardGrid), same
   split of responsibility as useColumnPrefs + resolveColumnOrder.

   Bumped to schemaVersion 2 when `hidden`/`sizes` were added — v1 docs
   (`{schemaVersion: 1, order}`) are discarded on read, same "older schemas
   are discarded" convention as usePreferencesSync. */

import * as React from 'react'

import type { DashboardWidgetSize } from '../DashboardGrid.js'

const SCHEMA_VERSION = 2
const DEBOUNCE_MS = 800
const PREF_KEY = 'dashboard-layout'

type StoredPref = {
  schemaVersion: number
  order: string[]
  hidden: string[]
  sizes: Record<string, DashboardWidgetSize>
}

type State = {
  order: string[] | undefined
  hidden: string[]
  sizes: Record<string, DashboardWidgetSize>
  loaded: boolean
}

export type UseDashboardLayoutPrefsReturn = {
  order: string[] | undefined
  hidden: string[]
  sizes: Record<string, DashboardWidgetSize>
  loaded: boolean
  setOrder: (next: string[]) => void
  setHidden: (next: string[]) => void
  setSize: (id: string, size: DashboardWidgetSize) => void
}

export function useDashboardLayoutPrefs(): UseDashboardLayoutPrefsReturn {
  const [state, setState] = React.useState<State>({
    order: undefined,
    hidden: [],
    sizes: {},
    loaded: false,
  })

  const hydratedRef = React.useRef(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = React.useRef<{
    order: string[] | undefined
    hidden: string[]
    sizes: Record<string, DashboardWidgetSize>
  } | null>(null)
  const dirtyRef = React.useRef(false)
  // null = unknown, false = confirmed missing, string = existing doc id
  const prefDocIdRef = React.useRef<string | null | false>(null)

  const findPrefDoc = React.useCallback(async (): Promise<{
    id: string
    value: StoredPref | null
  } | null> => {
    const params = new URLSearchParams()
    params.set('where[key][equals]', PREF_KEY)
    params.set('limit', '1')
    params.set('depth', '0')
    try {
      const res = await fetch(
        `/api/payload-preferences?${params.toString()}`,
        { credentials: 'include' },
      )
      if (!res.ok) return null
      const body = (await res.json()) as {
        docs?: Array<{ id: string; value: StoredPref | null }>
      }
      const doc = body.docs?.[0]
      if (!doc) return null
      return { id: String(doc.id), value: doc.value ?? null }
    } catch {
      return null
    }
  }, [])

  const writePrefDoc = React.useCallback(
    async (value: StoredPref): Promise<void> => {
      let id = prefDocIdRef.current
      if (id === null) {
        const found = await findPrefDoc()
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
          body: JSON.stringify({ key: PREF_KEY, value }),
        })
        if (!res.ok) return
        const body = (await res.json()) as { doc?: { id?: string } }
        if (body.doc?.id) prefDocIdRef.current = String(body.doc.id)
      } catch {
        // Next write attempt will retry.
      }
    },
    [findPrefDoc],
  )

  // Hydrate on mount.
  React.useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    let cancelled = false
    void (async () => {
      const found = await findPrefDoc()
      prefDocIdRef.current = found?.id ?? false
      if (cancelled) return
      const stored = found?.value
      if (stored && stored.schemaVersion === SCHEMA_VERSION) {
        setState({
          order: Array.isArray(stored.order) ? stored.order : undefined,
          hidden: Array.isArray(stored.hidden) ? stored.hidden : [],
          sizes:
            stored.sizes && typeof stored.sizes === 'object' ? stored.sizes : {},
          loaded: true,
        })
        return
      }
      setState((prev) => ({ ...prev, loaded: true }))
    })()

    return () => {
      cancelled = true
    }
  }, [findPrefDoc])

  const flushNow = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!dirtyRef.current) return
    const pending = pendingRef.current
    if (!pending) return
    dirtyRef.current = false
    void writePrefDoc({
      schemaVersion: SCHEMA_VERSION,
      order: pending.order ?? [],
      hidden: pending.hidden,
      sizes: pending.sizes,
    })
  }, [writePrefDoc])

  const scheduleWrite = React.useCallback(
    (next: {
      order: string[] | undefined
      hidden: string[]
      sizes: Record<string, DashboardWidgetSize>
    }) => {
      pendingRef.current = next
      dirtyRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(flushNow, DEBOUNCE_MS)
    },
    [flushNow],
  )

  const setOrder = React.useCallback(
    (next: string[]) => {
      setState((prev) => {
        const updated = { ...prev, order: next }
        scheduleWrite({ order: next, hidden: prev.hidden, sizes: prev.sizes })
        return updated
      })
    },
    [scheduleWrite],
  )

  const setHidden = React.useCallback(
    (next: string[]) => {
      setState((prev) => {
        const updated = { ...prev, hidden: next }
        scheduleWrite({ order: prev.order, hidden: next, sizes: prev.sizes })
        return updated
      })
    },
    [scheduleWrite],
  )

  const setSize = React.useCallback(
    (id: string, size: DashboardWidgetSize) => {
      setState((prev) => {
        const nextSizes = { ...prev.sizes, [id]: size }
        const updated = { ...prev, sizes: nextSizes }
        scheduleWrite({ order: prev.order, hidden: prev.hidden, sizes: nextSizes })
        return updated
      })
    },
    [scheduleWrite],
  )

  // Flush on tab hide / unload / unmount so debounced writes don't get lost.
  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow()
    }
    window.addEventListener('beforeunload', flushNow)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', flushNow)
      document.removeEventListener('visibilitychange', onVisibility)
      flushNow()
    }
  }, [flushNow])

  return {
    order: state.order,
    hidden: state.hidden,
    sizes: state.sizes,
    loaded: state.loaded,
    setOrder,
    setHidden,
    setSize,
  }
}

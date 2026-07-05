'use client'

/* Owns the doc form's dirty-path bookkeeping: `dirty` (the Set<string> of
   dotted paths with unsaved edits — drives the "any dirty?" UX) and
   `dirtyLocalesRef` (which locales of a given path are dirty, for v3.8
   per-locale save/autosave cleanup). The two must always move together —
   every mutation site in AutoDocFormBridge touched both by hand before this
   extraction, and the two success-cleanup call sites in `submit` duplicated
   nearly identical prune logic. This hook is that shared logic, extracted
   verbatim (see REVIEW-FINDINGS.md 3.2) — no behavior change. `dirtyRef`
   mirrors `dirty` via effect, same as before, so the async autosave path in
   `submit` keeps reading the ref while the manual path reads the state. */

import * as React from 'react'

export type DirtyTracking = {
  dirty: Set<string>
  dirtyRef: React.MutableRefObject<Set<string>>
  /** Marks `path` dirty; if `locale` is set, also records that locale as
   *  dirty for `path` (v3.8 per-locale tracking). Mirrors the write side of
   *  `setValueAtPath`. */
  markDirty: (path: string, locale: string | null) => void
  /** Full reset — re-baselining (fresh doc payload) and Discard both want
   *  this exact shape. */
  resetDirty: () => void
  /** Autosave success cleanup: for each currently-dirty path, drop it only
   *  when `shouldClear(path)` is true (the autosave snapshot cleanup checks
   *  the current value still deep-equals what was shipped). When `locale`
   *  is set, clearing only removes that locale from `dirtyLocalesRef`; the
   *  path itself stays dirty if another locale's edit is still pending. A
   *  no-op state update is skipped (mirrors the original's `changed`
   *  guard, avoiding a wasted re-render when nothing actually cleared). */
  pruneDirtyConditional: (
    locale: string | null,
    shouldClear: (path: string) => boolean,
  ) => void
  /** Manual per-locale save success: every currently-dirty path clears
   *  unconditionally for `locale` (the whole active-locale slice was just
   *  shipped); a path stays dirty only if another locale is still pending. */
  pruneDirtyForLocale: (locale: string) => void
}

export function useDirtyTracking(): DirtyTracking {
  const [dirty, setDirty] = React.useState<Set<string>>(() => new Set())
  const dirtyRef = React.useRef(dirty)
  React.useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  const dirtyLocalesRef = React.useRef<Map<string, Set<string>>>(new Map())

  const markDirty = React.useCallback((path: string, locale: string | null) => {
    setDirty((prevDirty) => {
      const copy = new Set(prevDirty)
      copy.add(path)
      return copy
    })
    if (locale) {
      const set = dirtyLocalesRef.current.get(path) ?? new Set<string>()
      set.add(locale)
      dirtyLocalesRef.current.set(path, set)
    }
  }, [])

  const resetDirty = React.useCallback(() => {
    setDirty(new Set())
    dirtyLocalesRef.current = new Map()
  }, [])

  const pruneDirtyConditional = React.useCallback(
    (locale: string | null, shouldClear: (path: string) => boolean) => {
      setDirty((prev) => {
        let changed = false
        const next = new Set<string>()
        for (const path of prev) {
          if (!shouldClear(path)) {
            next.add(path)
            continue
          }
          changed = true
          if (locale) {
            const set = dirtyLocalesRef.current.get(path)
            if (set) {
              set.delete(locale)
              if (set.size === 0) dirtyLocalesRef.current.delete(path)
              else {
                // Other locales still dirty — keep path in dirty Set.
                next.add(path)
              }
            }
          }
        }
        return changed ? next : prev
      })
    },
    [],
  )

  const pruneDirtyForLocale = React.useCallback((locale: string) => {
    setDirty((prev) => {
      const next = new Set<string>()
      for (const path of prev) {
        const set = dirtyLocalesRef.current.get(path)
        if (set) {
          set.delete(locale)
          if (set.size === 0) dirtyLocalesRef.current.delete(path)
          else {
            next.add(path)
            continue
          }
        }
        // Non-localized dirty path: cleared by this save.
      }
      return next
    })
  }, [])

  return {
    dirty,
    dirtyRef,
    markDirty,
    resetDirty,
    pruneDirtyConditional,
    pruneDirtyForLocale,
  }
}

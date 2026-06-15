'use client'

/* Shared collapse-state utilities for ArrayInput and BlocksInput.
   Keeps both inputs DRY — they import the hook, controls component, and
   preview helper from here rather than duplicating the logic. */

import * as React from 'react'
import { ChevronsDownUpIcon, ChevronsUpDownIcon } from 'lucide-react'

import { useTranslation } from '../../../internal/payloadAdapter.js'
import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Button } from 'payload-plugin-shadcn-ui'
import type { ExtractedField } from 'payload-plugin-shadcn-ui'

// ── Collapse state hook ──────────────────────────────────────────────────────

type CollapseMap = Record<string, boolean>

export type UseRowCollapseReturn = {
  isCollapsed: (id: string) => boolean
  toggle: (id: string) => void
  collapseAll: () => void
  expandAll: () => void
  markExpanded: (id: string) => void
}

/**
 * Tracks collapsed/expanded state per stable row id.
 *
 * - All ids present on first render start **collapsed** (true).
 * - Ids not in the map default to **expanded** (false) — newly-added rows that
 *   haven't been explicitly registered yet are treated as open.
 * - Call `markExpanded(id)` right after creating a new row so "Collapse all"
 *   can later reach it.
 * - `collapseAll`/`expandAll` operate on the live set of ids in the map.
 */
export function useRowCollapse(rowIds: string[]): UseRowCollapseReturn {
  // Capture the initial ids so the lazy initializer is truly lazy (only runs
  // on mount, not on re-renders).
  const initialRef = React.useRef(rowIds)

  const [map, setMap] = React.useState<CollapseMap>(() => {
    const m: CollapseMap = {}
    for (const id of initialRef.current) m[id] = true
    return m
  })

  const isCollapsed = React.useCallback(
    (id: string) => map[id] ?? false,
    [map],
  )

  const toggle = React.useCallback(
    (id: string) =>
      setMap((prev) => ({ ...prev, [id]: !(prev[id] ?? false) })),
    [],
  )

  const collapseAll = React.useCallback(
    () =>
      setMap((prev) => {
        const next: CollapseMap = {}
        for (const id of Object.keys(prev)) next[id] = true
        return next
      }),
    [],
  )

  const expandAll = React.useCallback(
    () =>
      setMap((prev) => {
        const next: CollapseMap = {}
        for (const id of Object.keys(prev)) next[id] = false
        return next
      }),
    [],
  )

  const markExpanded = React.useCallback(
    (id: string) => setMap((prev) => ({ ...prev, [id]: false })),
    [],
  )

  return { isCollapsed, toggle, collapseAll, expandAll, markExpanded }
}

// ── Collapse-all / Expand-all controls ──────────────────────────────────────

export function RowCollapseControls({
  onCollapseAll,
  onExpandAll,
}: {
  onCollapseAll: () => void
  onExpandAll: () => void
}): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  return (
    <div className="flex items-center gap-1 self-start">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCollapseAll}
        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronsDownUpIcon className="size-3.5" />
        {t('shadcnAdmin:collapseAll')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onExpandAll}
        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronsUpDownIcon className="size-3.5" />
        {t('shadcnAdmin:expandAll')}
      </Button>
    </div>
  )
}

// ── Row preview derivation ───────────────────────────────────────────────────

const TEXT_LIKE = new Set(['text', 'textarea', 'email'])

/**
 * Returns a short preview string for a collapsed row — the value of the first
 * text/textarea/email subfield that has a non-empty value. Handles both plain
 * strings and locale-keyed objects `{ de: '…', en: '…' }` (picks the first
 * non-empty locale value). Returns `undefined` if no preview can be derived.
 */
export function deriveRowPreview(
  subfields: ExtractedField[],
  row: Record<string, unknown>,
): string | undefined {
  for (const sub of subfields) {
    if (!sub.name || !TEXT_LIKE.has(sub.type)) continue
    const raw = row[sub.name]
    if (!raw) continue
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed) return trimmed
    } else if (
      typeof raw === 'object' &&
      raw !== null &&
      !Array.isArray(raw)
    ) {
      // locale-keyed leaf: { de: '…', en: '…' }
      for (const v of Object.values(raw as Record<string, unknown>)) {
        if (typeof v === 'string') {
          const trimmed = v.trim()
          if (trimmed) return trimmed
        }
      }
    }
  }
  return undefined
}

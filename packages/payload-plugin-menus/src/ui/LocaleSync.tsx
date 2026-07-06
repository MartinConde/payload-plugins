'use client'

/* "Sync from another language" panel shown above the tree editor. Reads the
   saved tree of another locale via the REST API and offers three merge
   modes (relabel from linked docs, copy labels as-is, keep current labels).
   Split out of MenuTreeEditor.tsx, which owns the tree state this writes back
   into via `onApply`. */

import * as React from 'react'
import { LanguagesIcon } from 'lucide-react'

import { useConfig } from '@payloadcms/ui'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useDocIdentity,
} from 'payload-plugin-shadcn-ui'

import { normalizeMenuTree, type MenuTree } from '../menuTree.js'
import { mergeKeepingLabels, relabelFromDocs, type Tr } from './menuTreeMutations.js'

export function LocaleSync({
  activeLocale,
  tree,
  disabled,
  useAsTitleBySlug,
  tr,
  onApply,
}: {
  activeLocale: string
  tree: MenuTree
  disabled?: boolean
  useAsTitleBySlug: Record<string, string | undefined>
  tr: Tr
  onApply: (next: MenuTree) => void
}): React.ReactElement | null {
  const { config } = useConfig()
  const { collectionSlug, documentId } = useDocIdentity()

  const locales = React.useMemo<{ code: string; label: string }[]>(() => {
    const loc = (config as { localization?: unknown } | undefined)?.localization
    if (!loc || typeof loc !== 'object') return []
    const list = (loc as { locales?: Array<{ code: string; label?: unknown }> })
      .locales
    if (!Array.isArray(list)) return []
    return list.map((l) => ({
      code: l.code,
      label: typeof l.label === 'string' ? l.label : l.code,
    }))
  }, [config])

  const sources = locales.filter((l) => l.code !== activeLocale)

  const [source, setSource] = React.useState('')
  // 'relabel' (default): re-derive document labels from the linked doc's title
  // in the current language. 'labels': copy source labels as-is. 'structure':
  // keep current labels where item ids match.
  const [mode, setMode] = React.useState<'relabel' | 'labels' | 'structure'>(
    'relabel',
  )
  const [status, setStatus] = React.useState<
    'idle' | 'loading' | 'error' | 'empty' | 'done'
  >('idle')

  if (sources.length === 0) return null

  const canSync =
    !disabled && documentId != null && collectionSlug != null && source !== ''

  const apply = async () => {
    if (!canSync) return
    setStatus('loading')
    try {
      const res = await fetch(
        `/api/${collectionSlug}/${documentId}?locale=${source}&depth=0&draft=true`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { tree?: unknown }
      const sourceTree = normalizeMenuTree(body.tree)
      // Never silently wipe the current language: the source read is of SAVED
      // data, so an unsaved/empty source would otherwise blow away the current
      // tree. Bail with a clear hint instead.
      if (sourceTree.length === 0) {
        setStatus('empty')
        return
      }
      // Replacing existing items is destructive — confirm first.
      if (
        tree.length > 0 &&
        !window.confirm(
          tr(
            'pluginMenus:syncConfirmOverwrite',
            'Replace the current language’s items with the copied structure?',
          ),
        )
      ) {
        setStatus('idle')
        return
      }
      const next =
        mode === 'labels'
          ? sourceTree
          : mode === 'structure'
            ? mergeKeepingLabels(sourceTree, tree)
            : await relabelFromDocs(sourceTree, activeLocale, useAsTitleBySlug)
      onApply(next)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <LanguagesIcon className="size-3.5" />
        {tr('pluginMenus:syncTitle', 'Sync from another language')}
      </div>
      <p className="text-xs text-muted-foreground">
        {tr(
          'pluginMenus:syncHint',
          'Copies the saved structure of another language — save your changes first.',
        )}
      </p>
      {documentId == null ? (
        <p className="text-xs text-muted-foreground">
          {tr(
            'pluginMenus:syncSaveFirst',
            'Save the menu once before syncing languages.',
          )}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={source} onValueChange={setSource} disabled={disabled}>
            <SelectTrigger className="h-8 w-[12rem]">
              <SelectValue
                placeholder={tr('pluginMenus:syncSourceLabel', 'Source language')}
              />
            </SelectTrigger>
            <SelectContent>
              {sources.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as 'relabel' | 'labels' | 'structure')}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[22rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relabel">
                {tr(
                  'pluginMenus:syncCopyRelabel',
                  'Labels from linked documents (this language)',
                )}
              </SelectItem>
              <SelectItem value="labels">
                {tr('pluginMenus:syncCopyWithLabels', 'Structure and labels (copy as-is)')}
              </SelectItem>
              <SelectItem value="structure">
                {tr(
                  'pluginMenus:syncCopyStructureOnly',
                  'Structure only (keep current labels)',
                )}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            disabled={!canSync || status === 'loading'}
            onClick={apply}
          >
            {status === 'loading'
              ? tr('pluginMenus:syncLoading', 'Loading…')
              : tr('pluginMenus:syncApply', 'Copy into current language')}
          </Button>
          {status === 'error' ? (
            <span className="text-xs text-destructive">
              {tr('pluginMenus:syncError', 'Could not load that language. Please try again.')}
            </span>
          ) : null}
          {status === 'empty' ? (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {tr(
                'pluginMenus:syncEmptySource',
                'The source language has no saved items. Save your changes first, then sync.',
              )}
            </span>
          ) : null}
          {status === 'done' ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {tr('pluginMenus:syncDone', 'Copied')}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}

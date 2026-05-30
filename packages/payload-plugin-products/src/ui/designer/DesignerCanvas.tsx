'use client'

/* Heavy designer component, lazy-loaded by DesignerField. Owns the
   ACTIVE-VIEW-INDEX and ACTIVE-COLOR-INDEX local state and mounts the
   existing Fabric editor against the active (view, color) `colorMockups`
   row. Note the `key={`${activeView}-${activeColor}`}` on EditorProvider —
   so a tab or chip switch tears down the Fabric canvas and disposes any
   in-flight 150ms debounce, preventing pending writes from clobbering the
   new row's geometry. */

import * as React from 'react'
import { ImagePlusIcon, InfoIcon, LockIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  useDocFormFieldValue,
} from 'payload-plugin-shadcn-ui'
import { useConfig, useTranslation } from '@payloadcms/ui'

import type { FieldInputProps } from '../adminTypes.js'
import { EditorCanvas } from '../editor/EditorCanvas.js'
import { EditorProvider } from '../editor/EditorContext.js'
import { EditorSidebar } from '../editor/EditorSidebar.js'
import { EditorToolbar } from '../editor/EditorToolbar.js'
import { useEditor } from '../editor/EditorContext.js'

import { ColorChips } from './ColorChips.js'
import { DesignerActiveProvider } from './DesignerActiveContext.js'
import { NoColorsEmptyState } from './NoColorsEmptyState.js'
import { useEditorBindings, type UseEditorBindingsResult } from './useEditorBindings.js'
import { ViewTabs } from './ViewTabs.js'

const DEFAULT_PRESETS = ['Front', 'Back', 'Left', 'Right', 'Sleeve']

const refToId = (raw: unknown): string | null => {
  if (raw == null) return null
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw)
  if (typeof raw === 'object') {
    const id = (raw as Record<string, unknown>).id
    return id == null ? null : String(id)
  }
  return null
}

export function DesignerCanvas(props: FieldInputProps): React.ReactElement {
  const [activeView, setActiveView] = React.useState(0)
  const [activeColor, setActiveColor] = React.useState(0)
  const custom = (props.field?.custom as Record<string, unknown> | undefined)?.[
    'plugin-shadcn-admin'
  ] as
    | {
        mediaCollectionSlug?: string
        defaultViewPresets?: string[]
        colorSwatchesSlug?: string
        printTemplatesSlug?: string
      }
    | undefined
  const mediaSlug = custom?.mediaCollectionSlug || 'media'
  const colorSwatchesSlug = custom?.colorSwatchesSlug || 'color-swatches'
  const printTemplatesSlug = custom?.printTemplatesSlug || 'print-templates'
  const presets =
    Array.isArray(custom?.defaultViewPresets) && custom.defaultViewPresets.length > 0
      ? custom.defaultViewPresets
      : DEFAULT_PRESETS

  const colorsRaw = useDocFormFieldValue('colors')
  const hasColors = React.useMemo(() => {
    if (!Array.isArray(colorsRaw)) return false
    return colorsRaw.some((c) => refToId(c) !== null)
  }, [colorsRaw])

  const viewName = useDocFormFieldValue(`views.${activeView}.name`) as
    | string
    | undefined
  const activeColorRef = useDocFormFieldValue(
    `views.${activeView}.colorMockups.${activeColor}.color`,
  )
  const activeColorId = refToId(activeColorRef)

  const bindings = useEditorBindings(
    activeView,
    activeColor,
    mediaSlug,
    props.disabled,
  )

  const activeCtx = React.useMemo(
    () => ({
      activeView,
      activeColor,
      setActiveView,
      setActiveColor,
      colorSwatchesSlug,
      printTemplatesSlug,
      mediaCollectionSlug: mediaSlug,
    }),
    [activeView, activeColor, colorSwatchesSlug, printTemplatesSlug, mediaSlug],
  )

  return (
    <DesignerActiveProvider value={activeCtx}>
      <div className="flex flex-col gap-3">
        <ViewTabs
          active={activeView}
          onActive={setActiveView}
          presets={presets}
          disabled={props.disabled}
        />
        {hasColors ? (
          <ColorChips
            activeColor={activeColor}
            onActiveColor={setActiveColor}
            viewIndex={activeView}
            colorSwatchesSlug={colorSwatchesSlug}
            disabled={props.disabled}
          />
        ) : null}
        {!hasColors ? (
          <NoColorsEmptyState />
        ) : bindings.hasViewDims ? (
          <EditorProvider
            key={`${activeView}-${activeColor}`}
            bindings={bindings}
          >
            <EditorShell
              placementLocked={bindings.placementLocked}
              unlockedSiblingCount={bindings.unlockedSiblingCount}
              viewName={viewName}
              colorLabel={activeColorId ?? ''}
              colorSwatchesSlug={colorSwatchesSlug}
            />
          </EditorProvider>
        ) : (
          <PickDimsEmptyState />
        )}
      </div>
    </DesignerActiveProvider>
  )
}

/* ~65/35 split mirroring PrintAreaEditor's layout. State-gated banners
   (no-id / error) come from EditorContext via useEditor(). */
function EditorShell({
  placementLocked,
  unlockedSiblingCount,
  viewName,
  colorLabel,
  colorSwatchesSlug,
}: Pick<UseEditorBindingsResult, 'placementLocked' | 'unlockedSiblingCount'> & {
  viewName: string | undefined
  colorLabel: string
  colorSwatchesSlug: string
}): React.ReactElement {
  const { loadState, tr } = useEditor()
  const resolvedColorName = useColorName(colorLabel, colorSwatchesSlug)

  if (loadState === 'no-id') {
    const text = tr('pluginProducts:uploadMockupTask')
      .replace(/\{\{color\}\}/g, resolvedColorName || colorLabel || '')
      .replace(/\{\{view\}\}/g, viewName ?? '')
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
          <ImagePlusIcon className="size-6" />
          <p className="text-sm">{text}</p>
        </CardContent>
      </Card>
    )
  }

  if (loadState === 'error') {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-center text-sm text-destructive">
          {tr('pluginProducts:imageError')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <EditorToolbar />
      <BroadcastBanner
        locked={placementLocked}
        count={unlockedSiblingCount}
        viewName={viewName}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 min-w-0">
          <EditorCanvas />
        </div>
        <div className="md:col-span-1 min-w-0">
          <EditorSidebar />
        </div>
      </div>
    </div>
  )
}

function BroadcastBanner({
  locked,
  count,
  viewName,
}: {
  locked: boolean
  count: number
  viewName: string | undefined
}): React.ReactElement {
  const { tr } = useEditor()
  if (locked) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
        <LockIcon className="size-3.5" />
        {tr('pluginProducts:broadcastBannerLocked')}
      </div>
    )
  }
  const text = tr('pluginProducts:broadcastBannerUnlocked')
    .replace(/\{\{count\}\}/g, String(count))
    .replace(/\{\{view\}\}/g, viewName ?? '')
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <InfoIcon className="size-3.5" />
      {text}
    </div>
  )
}

/* Tiny on-demand fetch for the active color's display name. Keeps the
   empty-state copy specific without lifting the whole chip-strip docsById
   map up to DesignerCanvas. depth=0 + a single id keeps the response small. */
function useColorName(colorId: string, colorSwatchesSlug: string): string {
  const { config } = useConfig()
  const apiBase = React.useMemo(() => {
    const server = (config?.serverURL as string) || ''
    const api = (config?.routes?.api as string) || '/api'
    return `${server}${api}`
  }, [config])
  const [name, setName] = React.useState('')
  React.useEffect(() => {
    setName('')
    if (!colorId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(
          `${apiBase}/${colorSwatchesSlug}/${colorId}?depth=0`,
          { credentials: 'include' },
        )
        if (!res.ok || cancelled) return
        const doc = (await res.json()) as { name?: unknown }
        if (cancelled) return
        if (typeof doc.name === 'string') setName(doc.name)
      } catch {
        // Soft fail — caller substitutes the id as fallback.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [colorId, apiBase, colorSwatchesSlug])
  return name
}

function PickDimsEmptyState(): React.ReactElement {
  const { t } = useTranslation()
  const tr = (k: string): string => (t as (k: string) => string)(k)
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        {tr('pluginProducts:pickTemplateOrCustom')}
      </CardContent>
    </Card>
  )
}

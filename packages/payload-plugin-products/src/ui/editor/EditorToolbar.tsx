'use client'

/* Editor toolbar: Add-Area button (uses the active VIEW's mm dims; Phase 4
   collapsed the legacy per-area preset dropdown — dimensions live on the
   view since Phase 2), count badge, loading indicator. */

import * as React from 'react'
import { Loader2Icon, PlusIcon } from 'lucide-react'
import {
  Badge,
  Button,
  useDocFormFieldValue,
} from 'payload-plugin-shadcn-ui'

import { useDesignerActive } from '../designer/DesignerActiveContext.js'
import { useEditor } from './EditorContext.js'
import type { ViewDims } from '../printArea.js'

export function EditorToolbar(): React.ReactElement {
  const { addArea, areaCount, disabled, loadState, tr } = useEditor()
  const { activeView } = useDesignerActive()

  const resolved = useDocFormFieldValue(`views.${activeView}.resolvedDimsMm`) as
    | ViewDims
    | undefined
  const cw = useDocFormFieldValue(`views.${activeView}.widthMm`) as number | undefined
  const ch = useDocFormFieldValue(`views.${activeView}.heightMm`) as number | undefined
  const viewName = (useDocFormFieldValue(`views.${activeView}.name`) as string | undefined) ||
    tr('pluginProducts:viewName')

  const dims: ViewDims | null = React.useMemo(() => {
    if (resolved && resolved.widthMm > 0 && resolved.heightMm > 0) return resolved
    if (typeof cw === 'number' && typeof ch === 'number' && cw > 0 && ch > 0) {
      return { widthMm: cw, heightMm: ch }
    }
    return null
  }, [resolved, cw, ch])

  const canAdd = !disabled && loadState === 'loaded' && dims != null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        disabled={!canAdd}
        onClick={() => {
          if (!dims) return
          addArea({ label: viewName, widthMm: dims.widthMm, heightMm: dims.heightMm })
        }}
      >
        <PlusIcon className="size-4" />
        {tr('pluginProducts:addArea')}
      </Button>
      <Badge variant="secondary">
        {areaCount === 1
          ? tr('pluginProducts:areasCount_one').replace('{{count}}', '1')
          : tr('pluginProducts:areasCount_other').replace('{{count}}', String(areaCount))}
      </Badge>
      {loadState === 'loading' && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          {tr('pluginProducts:loadingImage')}
        </span>
      )}
    </div>
  )
}

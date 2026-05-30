'use client'

/* Sync sidebar tab — the lever that makes this designer dramatically better
   than Chamevo. Five one-click actions operate over the products form's
   multi-row state:

     1. Auto-center mockup (active view, active color)
     2. Apply current row's mockupTransform to every other color of this view
     3. Apply current row's mockupTransform across every (view, color)
     4. Copy print area from another view → unlocked rows of this view
     5. Re-fit empty / non-identity mockups across all rows of this view

   All writes go through `useDocFormSetValue`, which is the same channel the
   editor's broadcast onChange uses. Destructive actions (anything affecting
   more than the active row) prompt with window.confirm — shadcn-admin doesn't
   re-export Dialog primitives yet (flagged in plan §3.4 / Phase 5). */

import * as React from 'react'
import {
  AlignCenterIcon,
  CopyIcon,
  FoldVerticalIcon,
  LayersIcon,
  Wand2Icon,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
  useDocFormFieldValue,
  useDocFormSetValue,
} from 'payload-plugin-shadcn-ui'

import { useEditor } from '../editor/EditorContext.js'
import { useDesignerActive } from './DesignerActiveContext.js'
import {
  IDENTITY_MOCKUP_TRANSFORM,
  type ColorMockupRow,
  type MockupTransform,
  type PrintAreaPlacement,
  type ViewRow,
} from '../printArea.js'

const isIdentityTransform = (mt: MockupTransform | undefined | null): boolean => {
  if (!mt) return true
  return (
    Math.abs(mt.x) < 1e-6 &&
    Math.abs(mt.y) < 1e-6 &&
    Math.abs(mt.scale - 1) < 1e-6 &&
    !mt.locked
  )
}

const hasMockup = (row: ColorMockupRow | undefined | null): boolean => {
  if (!row) return false
  const m = row.mockup as unknown
  if (m == null) return false
  if (typeof m === 'string' || typeof m === 'number') return true
  if (typeof m === 'object') {
    const id = (m as Record<string, unknown>).id
    return id != null
  }
  return false
}

export function SyncActionsPanel(): React.ReactElement {
  const { activeView, activeColor } = useDesignerActive()
  const { alignMockup, disabled, tr } = useEditor()
  const setValueAtPath = useDocFormSetValue()
  const viewsRaw = useDocFormFieldValue('views')

  const views: ViewRow[] = Array.isArray(viewsRaw) ? (viewsRaw as ViewRow[]) : []
  const activeViewRow = views[activeView]
  const activeRows: ColorMockupRow[] = Array.isArray(activeViewRow?.colorMockups)
    ? (activeViewRow!.colorMockups as ColorMockupRow[])
    : []
  const activeRow = activeRows[activeColor]
  const activeTransform: MockupTransform | undefined = activeRow?.mockupTransform
  const activeViewName: string =
    typeof activeViewRow?.name === 'string' && activeViewRow.name
      ? activeViewRow.name
      : `View ${activeView + 1}`

  /* --- Action 1: Auto-center (this view, this color) --- */
  const autoCenter = React.useCallback(() => {
    alignMockup('centerH')
    alignMockup('middle')
  }, [alignMockup])

  /* --- Action 2: Apply transform to all colors of this view --- */
  const applyTransformToColors = React.useCallback(() => {
    if (!activeTransform) return
    const otherCount = Math.max(0, activeRows.length - 1)
    if (otherCount === 0) return
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        tr('pluginProducts:syncConfirmTransformColors')
          .replace(/\{\{count\}\}/g, String(otherCount))
          .replace(/\{\{view\}\}/g, activeViewName),
      )
      if (!ok) return
    }
    activeRows.forEach((_row, j) => {
      if (j === activeColor) return
      setValueAtPath(
        `views.${activeView}.colorMockups.${j}.mockupTransform`,
        { ...activeTransform },
      )
    })
  }, [activeTransform, activeRows, activeColor, activeView, activeViewName, setValueAtPath, tr])

  /* --- Action 3: Apply transform across every (view, color) row --- */
  const applyTransformToAll = React.useCallback(() => {
    if (!activeTransform) return
    let total = 0
    views.forEach((v, vi) => {
      const rows = Array.isArray(v?.colorMockups) ? v.colorMockups : []
      rows.forEach((_r, ri) => {
        if (vi === activeView && ri === activeColor) return
        total += 1
      })
    })
    if (total === 0) return
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        tr('pluginProducts:syncConfirmTransformAll').replace(
          /\{\{count\}\}/g,
          String(total),
        ),
      )
      if (!ok) return
    }
    views.forEach((v, vi) => {
      const rows: ColorMockupRow[] = Array.isArray(v?.colorMockups)
        ? (v!.colorMockups as ColorMockupRow[])
        : []
      rows.forEach((_r, ri) => {
        if (vi === activeView && ri === activeColor) return
        setValueAtPath(
          `views.${vi}.colorMockups.${ri}.mockupTransform`,
          { ...activeTransform },
        )
      })
    })
  }, [activeTransform, views, activeView, activeColor, setValueAtPath, tr])

  /* --- Action 4: Copy print area from another view into unlocked rows of
   *   this view. Source placement = first unlocked row of source view, or
   *   row 0 if all locked. */
  const copyAreaFromView = React.useCallback(
    (sourceViewIndex: number) => {
      const sv = views[sourceViewIndex]
      const sRows: ColorMockupRow[] = Array.isArray(sv?.colorMockups)
        ? (sv!.colorMockups as ColorMockupRow[])
        : []
      if (sRows.length === 0) return
      let srcPlacements: PrintAreaPlacement[] = []
      for (const row of sRows) {
        if (!row?.placementLocked) {
          srcPlacements = Array.isArray(row?.printAreaPlacement)
            ? row.printAreaPlacement
            : []
          break
        }
      }
      if (srcPlacements.length === 0 && sRows[0]) {
        srcPlacements = Array.isArray(sRows[0].printAreaPlacement)
          ? sRows[0].printAreaPlacement
          : []
      }
      const unlockedTargets = activeRows.reduce(
        (acc, row) => (row?.placementLocked ? acc : acc + 1),
        0,
      )
      if (unlockedTargets === 0) return
      const sourceViewName =
        typeof sv?.name === 'string' && sv.name ? sv.name : `View ${sourceViewIndex + 1}`
      if (typeof window !== 'undefined') {
        const ok = window.confirm(
          tr('pluginProducts:syncConfirmCopyArea')
            .replace(/\{\{srcView\}\}/g, sourceViewName)
            .replace(/\{\{view\}\}/g, activeViewName)
            .replace(/\{\{count\}\}/g, String(unlockedTargets)),
        )
        if (!ok) return
      }
      activeRows.forEach((row, j) => {
        if (row?.placementLocked) return
        setValueAtPath(
          `views.${activeView}.colorMockups.${j}.printAreaPlacement`,
          srcPlacements.map((p) => ({ ...p })),
        )
      })
    },
    [views, activeRows, activeView, activeViewName, setValueAtPath, tr],
  )

  /* --- Action 5: Re-fit empty/non-identity mockups. Writes identity transform
   *   to every row whose mockup is set but whose transform is non-identity.
   *   Identity is the fit-to-canvas baseline — Phase 5 will add an actual
   *   per-row natural-aspect fit when needed (flagged in plan §7). */
  const reFitEmpty = React.useCallback(() => {
    let total = 0
    const targets: Array<{ vi: number; ri: number }> = []
    views.forEach((v, vi) => {
      const rows: ColorMockupRow[] = Array.isArray(v?.colorMockups)
        ? (v!.colorMockups as ColorMockupRow[])
        : []
      rows.forEach((row, ri) => {
        if (hasMockup(row) && !isIdentityTransform(row.mockupTransform)) {
          targets.push({ vi, ri })
          total += 1
        }
      })
    })
    if (total === 0) {
      // Nothing to do — soft signal via confirm with count 0, OR silently
      // exit. Silent exit is cleaner for a one-click action.
      return
    }
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        tr('pluginProducts:syncConfirmReFit').replace(
          /\{\{count\}\}/g,
          String(total),
        ),
      )
      if (!ok) return
    }
    for (const { vi, ri } of targets) {
      setValueAtPath(
        `views.${vi}.colorMockups.${ri}.mockupTransform`,
        { ...IDENTITY_MOCKUP_TRANSFORM },
      )
    }
  }, [views, setValueAtPath, tr])

  const otherViews = views
    .map((v, i) => ({ name: typeof v?.name === 'string' ? v.name : `View ${i + 1}`, i }))
    .filter(({ i }) => i !== activeView)

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="text-xs font-medium text-muted-foreground">
          {tr('pluginProducts:syncActionsHeading')}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={autoCenter}
          className="justify-start"
        >
          <AlignCenterIcon className="size-4" />
          {tr('pluginProducts:syncAutoCenter')}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || activeRows.length <= 1}
          onClick={applyTransformToColors}
          className="justify-start"
        >
          <LayersIcon className="size-4" />
          {tr('pluginProducts:syncApplyTransformToColors')}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || views.length === 0}
          onClick={applyTransformToAll}
          className="justify-start"
        >
          <LayersIcon className="size-4" />
          {tr('pluginProducts:syncApplyTransformToAll')}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || otherViews.length === 0}
              className="justify-start"
            >
              <CopyIcon className="size-4" />
              {tr('pluginProducts:syncCopyAreaFromView')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {otherViews.length === 0 ? (
              <DropdownMenuItem disabled>
                {tr('pluginProducts:syncCopyAreaPickView')}
              </DropdownMenuItem>
            ) : (
              otherViews.map(({ name, i }) => (
                <DropdownMenuItem key={i} onSelect={() => copyAreaFromView(i)}>
                  {name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator />

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={reFitEmpty}
          className="justify-start"
        >
          <FoldVerticalIcon className="size-4" />
          {tr('pluginProducts:syncReFitEmpty')}
        </Button>

        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Wand2Icon className="size-3" />
          <span>{tr('pluginProducts:syncFooterHint')}</span>
        </div>
      </CardContent>
    </Card>
  )
}

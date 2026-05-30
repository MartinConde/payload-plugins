'use client'

/* Selected-area form: name, mm dimensions, align row, delete. Same controls
   that lived inline in the monolithic editor — just lifted into a tab so the
   sidebar can also surface image controls without crowding.

   Phase 4: prepends a `ViewPrintAreaPanel` section that lets the admin set the
   active VIEW's print-area template / custom dims from inside the Designer
   (no need to scroll up to the views[] array UI). Changing the dims aspect-
   snaps every unlocked colorMockups row of the view via
   `snapPlacementsToAspect`. The active row's mockup natural aspect is used as
   a proxy for all unlocked siblings (a per-row natural-aspect fetch would
   require a coordinated read across all rows — flagged in Phase 5). */

import * as React from 'react'
import {
  AlignHorizontalJustifyCenterIcon,
  AlignHorizontalJustifyEndIcon,
  AlignHorizontalJustifyStartIcon,
  AlignVerticalJustifyCenterIcon,
  AlignVerticalJustifyEndIcon,
  AlignVerticalJustifyStartIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  useDocFormFieldValue,
  useDocFormSetValue,
} from 'payload-plugin-shadcn-ui'
// RelationshipPicker still lives in the admin plugin (it reads bridge-internal
// doc-identity / locale to exclude self-references).
import { RelationshipPicker } from 'payload-plugin-shadcn-admin/client'
import { useConfig } from '@payloadcms/ui'

import { useDesignerActive } from '../../designer/DesignerActiveContext.js'
import { InlineCreateTemplate } from '../../designer/InlineCreateTemplate.js'
import {
  snapPlacementsToAspect,
  type ColorMockupRow,
  type PrintAreaPlacement,
  type ViewDims,
} from '../../printArea.js'
import { useEditor } from '../EditorContext.js'

export function PrintAreasTab(): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <ViewPrintAreaPanel />
      <SelectedAreaCard />
    </div>
  )
}

function SelectedAreaCard(): React.ReactElement {
  const {
    align,
    deleteSelected,
    disabled,
    lockPerAreaMm,
    selected,
    tr,
    updateSelectedMm,
    updateSelectedName,
  } = useEditor()
  const mmDisabled = disabled || lockPerAreaMm

  if (!selected) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {tr('pluginProducts:noAreaSelected')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pa-name">{tr('pluginProducts:areaNameLabel')}</Label>
          <Input
            id="pa-name"
            value={selected.name}
            disabled={disabled}
            placeholder={tr('pluginProducts:areaNamePlaceholder')}
            onChange={(e) => updateSelectedName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pa-w">{tr('pluginProducts:widthMmLabel')}</Label>
            <Input
              id="pa-w"
              type="number"
              min={1}
              value={selected.widthMm}
              disabled={mmDisabled}
              onChange={(e) => updateSelectedMm('widthMm', Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pa-h">{tr('pluginProducts:heightMmLabel')}</Label>
            <Input
              id="pa-h"
              type="number"
              min={1}
              value={selected.heightMm}
              disabled={mmDisabled}
              onChange={(e) => updateSelectedMm('heightMm', Number(e.target.value))}
            />
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <Label>{tr('pluginProducts:align')}</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled}
              title={tr('pluginProducts:alignLeft')}
              onClick={() => align('left')}
            >
              <AlignHorizontalJustifyStartIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled}
              title={tr('pluginProducts:alignCenterH')}
              onClick={() => align('centerH')}
            >
              <AlignHorizontalJustifyCenterIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled}
              title={tr('pluginProducts:alignRight')}
              onClick={() => align('right')}
            >
              <AlignHorizontalJustifyEndIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled}
              title={tr('pluginProducts:alignTop')}
              onClick={() => align('top')}
            >
              <AlignVerticalJustifyStartIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled}
              title={tr('pluginProducts:alignMiddle')}
              onClick={() => align('middle')}
            >
              <AlignVerticalJustifyCenterIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled}
              title={tr('pluginProducts:alignBottom')}
              onClick={() => align('bottom')}
            >
              <AlignVerticalJustifyEndIcon className="size-4" />
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={disabled}
          onClick={() => deleteSelected()}
        >
          <Trash2Icon className="size-4" />
          {tr('pluginProducts:deleteArea')}
        </Button>
      </CardContent>
    </Card>
  )
}

/* View-level print-area picker. Reads view sub-fields directly so a change
   here updates the same form-state path the views[] array UI binds to —
   round-trips through normal save flow. */
function ViewPrintAreaPanel(): React.ReactElement {
  const { activeView, printTemplatesSlug } = useDesignerActive()
  const { tr, disabled, media } = useEditor()
  const setValueAtPath = useDocFormSetValue()

  const viewBase = `views.${activeView}`
  const source = (useDocFormFieldValue(`${viewBase}.printAreaSource`) as
    | 'template'
    | 'custom'
    | undefined) ?? 'template'
  const templateId = useDocFormFieldValue(`${viewBase}.printAreaTemplate`)
  const widthMm = useDocFormFieldValue(`${viewBase}.widthMm`) as number | undefined
  const heightMm = useDocFormFieldValue(`${viewBase}.heightMm`) as number | undefined
  const bleedMm = useDocFormFieldValue(`${viewBase}.bleedMm`) as number | undefined
  const resolved = useDocFormFieldValue(`${viewBase}.resolvedDimsMm`) as
    | ViewDims
    | undefined
  const colorMockups = useDocFormFieldValue(`${viewBase}.colorMockups`) as
    | ColorMockupRow[]
    | undefined

  const [templateName, setTemplateName] = React.useState<string>('')

  const { config } = useConfig()
  const apiBase = React.useMemo(() => {
    const server = (config?.serverURL as string) || ''
    const api = (config?.routes?.api as string) || '/api'
    return `${server}${api}`
  }, [config])

  const idFromRef = (raw: unknown): string | null => {
    if (raw == null) return null
    if (typeof raw === 'string' || typeof raw === 'number') return String(raw)
    if (typeof raw === 'object') {
      const id = (raw as Record<string, unknown>).id
      return id == null ? null : String(id)
    }
    return null
  }

  // Refresh the read-only summary's template name on changes. Uses depth=0 so
  // the response is tiny; tolerate fetch failures silently (the summary falls
  // back to the id).
  React.useEffect(() => {
    const id = idFromRef(templateId)
    if (!id) {
      setTemplateName('')
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(
          `${apiBase}/${printTemplatesSlug}/${id}?depth=0`,
          { credentials: 'include' },
        )
        if (!res.ok || cancelled) return
        const doc = (await res.json()) as { name?: unknown }
        if (!cancelled && typeof doc.name === 'string') setTemplateName(doc.name)
      } catch {
        // soft fail
      }
    })()
    return () => {
      cancelled = true
    }
  }, [templateId, apiBase, printTemplatesSlug])

  // Helper: fetch a template doc's mm. Used right after a template change so
  // we know the new effective dims before resolvedDimsMm refreshes on save.
  const fetchTemplateDims = React.useCallback(
    async (id: string): Promise<ViewDims | null> => {
      try {
        const res = await fetch(
          `${apiBase}/${printTemplatesSlug}/${id}?depth=0`,
          { credentials: 'include' },
        )
        if (!res.ok) return null
        const doc = (await res.json()) as {
          widthMm?: unknown
          heightMm?: unknown
          bleedMm?: unknown
        }
        const w = Number(doc.widthMm)
        const h = Number(doc.heightMm)
        if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
        const b = Number(doc.bleedMm)
        return {
          widthMm: w,
          heightMm: h,
          ...(Number.isFinite(b) && b > 0 ? { bleedMm: b } : {}),
        }
      } catch {
        return null
      }
    },
    [apiBase, printTemplatesSlug],
  )

  // Aspect-snap every unlocked colorMockups[] row's placement to the new mm
  // aspect. Uses the active row's media natural aspect as a proxy for all
  // rows. Confirms only if there's something to do.
  const snapAllUnlockedToNewDims = React.useCallback(
    (newDims: ViewDims) => {
      const rows: ColorMockupRow[] = Array.isArray(colorMockups)
        ? (colorMockups as ColorMockupRow[])
        : []
      if (rows.length === 0) return
      const naturalAspect =
        media && media.width > 0 && media.height > 0
          ? media.width / media.height
          : 1
      const nonEmpty = rows.reduce(
        (acc, row) =>
          !row?.placementLocked &&
          Array.isArray(row?.printAreaPlacement) &&
          row.printAreaPlacement.length > 0
            ? acc + 1
            : acc,
        0,
      )
      if (nonEmpty > 0 && typeof window !== 'undefined') {
        const ok = window.confirm(
          tr('pluginProducts:aspectSnapConfirm').replace(
            /\{\{count\}\}/g,
            String(nonEmpty),
          ),
        )
        if (!ok) return
      }
      rows.forEach((row, j) => {
        if (row?.placementLocked) return
        const placements: PrintAreaPlacement[] = Array.isArray(row?.printAreaPlacement)
          ? row.printAreaPlacement
          : []
        const snapped = snapPlacementsToAspect(placements, newDims, naturalAspect)
        setValueAtPath(
          `${viewBase}.colorMockups.${j}.printAreaPlacement`,
          snapped,
        )
      })
    },
    [colorMockups, media, viewBase, setValueAtPath, tr],
  )

  const handleSourceChange = React.useCallback(
    (next: 'template' | 'custom') => {
      setValueAtPath(`${viewBase}.printAreaSource`, next)
      // Aspect snap on flip only when the effective dims actually differ; we
      // don't know the "other side"'s dims here, so defer — the change of
      // template/dims handlers below trigger the snap once the user picks.
    },
    [setValueAtPath, viewBase],
  )

  const handleTemplatePick = React.useCallback(
    async (next: string | string[] | null) => {
      const id = Array.isArray(next) ? next[0] : next
      setValueAtPath(`${viewBase}.printAreaTemplate`, id ?? null)
      if (!id) return
      const dims = await fetchTemplateDims(String(id))
      if (dims) snapAllUnlockedToNewDims(dims)
    },
    [setValueAtPath, viewBase, fetchTemplateDims, snapAllUnlockedToNewDims],
  )

  const handleTemplateCreated = React.useCallback(
    (id: string) => {
      // New template just landed — switch source to template, assign, and snap.
      setValueAtPath(`${viewBase}.printAreaSource`, 'template')
      setValueAtPath(`${viewBase}.printAreaTemplate`, id)
      void (async () => {
        const dims = await fetchTemplateDims(id)
        if (dims) snapAllUnlockedToNewDims(dims)
      })()
    },
    [setValueAtPath, viewBase, fetchTemplateDims, snapAllUnlockedToNewDims],
  )

  const handleCustomDim = React.useCallback(
    (key: 'widthMm' | 'heightMm' | 'bleedMm', raw: string) => {
      const n = Number(raw)
      setValueAtPath(`${viewBase}.${key}`, Number.isFinite(n) && n > 0 ? n : null)
      if (key === 'bleedMm') return
      // For width/height, recompute and snap with whatever dims we have.
      const nextW = key === 'widthMm' ? n : Number(widthMm ?? 0)
      const nextH = key === 'heightMm' ? n : Number(heightMm ?? 0)
      if (nextW > 0 && nextH > 0) {
        snapAllUnlockedToNewDims({
          widthMm: nextW,
          heightMm: nextH,
          ...(typeof bleedMm === 'number' && bleedMm > 0 ? { bleedMm } : {}),
        })
      }
    },
    [setValueAtPath, viewBase, widthMm, heightMm, bleedMm, snapAllUnlockedToNewDims],
  )

  const summaryDims =
    resolved && resolved.widthMm > 0 && resolved.heightMm > 0
      ? resolved
      : source === 'custom' && typeof widthMm === 'number' && typeof heightMm === 'number'
      ? { widthMm, heightMm }
      : null

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {tr('pluginProducts:printAreaSourceLabel')}
          </span>
          {summaryDims ? (
            <span className="text-xs text-muted-foreground">
              {templateName ? <strong>{templateName}</strong> : null}
              {templateName ? ' · ' : ''}
              {summaryDims.widthMm}×{summaryDims.heightMm} mm
            </span>
          ) : (
            <span className="text-xs italic text-muted-foreground">
              {tr('pluginProducts:viewPrintAreaNoTemplate')}
            </span>
          )}
        </div>

        <RadioGroup
          value={source}
          onValueChange={(v) => handleSourceChange(v as 'template' | 'custom')}
          disabled={disabled}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem id="vpa-template" value="template" />
            <Label htmlFor="vpa-template" className="text-xs font-normal">
              {tr('pluginProducts:sourceTemplate')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="vpa-custom" value="custom" />
            <Label htmlFor="vpa-custom" className="text-xs font-normal">
              {tr('pluginProducts:sourceCustom')}
            </Label>
          </div>
        </RadioGroup>

        {source === 'template' ? (
          <div className="flex flex-col gap-2">
            <RelationshipPicker
              relatedSlug={printTemplatesSlug}
              useAsTitle="name"
              multi={false}
              value={(idFromRef(templateId) as string | null) ?? null}
              onChange={(v) => void handleTemplatePick(v)}
            />
            <InlineCreateTemplate
              printTemplatesSlug={printTemplatesSlug}
              onCreated={handleTemplateCreated}
              disabled={disabled}
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vpa-w" className="text-xs">
                {tr('pluginProducts:widthMmLabel')}
              </Label>
              <Input
                id="vpa-w"
                type="number"
                min={1}
                value={typeof widthMm === 'number' ? widthMm : ''}
                disabled={disabled}
                onChange={(e) => handleCustomDim('widthMm', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vpa-h" className="text-xs">
                {tr('pluginProducts:heightMmLabel')}
              </Label>
              <Input
                id="vpa-h"
                type="number"
                min={1}
                value={typeof heightMm === 'number' ? heightMm : ''}
                disabled={disabled}
                onChange={(e) => handleCustomDim('heightMm', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vpa-b" className="text-xs">
                {tr('pluginProducts:bleedMmLabel')}
              </Label>
              <Input
                id="vpa-b"
                type="number"
                min={0}
                value={typeof bleedMm === 'number' ? bleedMm : ''}
                disabled={disabled}
                onChange={(e) => handleCustomDim('bleedMm', e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

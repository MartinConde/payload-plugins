'use client'

/* Bridge from a single (view, color) row's split sub-fields to the
   EditorBindings shape the Fabric editor consumes.

   READ side: reconstitute a legacy `PrintAreasValue` (areas: PrintArea[],
   mockupTransform, naturalWidth/Height) from
     - `views.${i}.colorMockups.${j}.printAreaPlacement` (geometry-only placements)
     - `views.${i}.colorMockups.${j}.mockupTransform`    (image transform)
     - `views.${i}.resolvedDimsMm` || (custom widthMm/heightMm/bleedMm)
   …plus the natural image dimensions returned by useMediaFetch against
   `views.${i}.colorMockups.${j}.mockup`.

   View-level dims still live on the view (not per color) because the print
   template / custom mm are a property of the print surface, not the colorway.

   WRITE side: split a fresh `PrintAreasValue` from EditorContext.onChange back
   into the persisted sub-fields. `naturalWidth`/`naturalHeight` are discarded
   (function of the loaded image). Per-area mm are discarded — physical mm
   live on the view; the sidebar's per-area mm input is locked via
   `lockPerAreaMm: true`.

   BROADCAST: when the active row's `placementLocked === false`, the same
   placements are written into every unlocked sibling row of the active view.
   Locked rows are skipped. The sibling-rows array is held in a ref updated
   every render, so the `onChange` identity stays stable across keystrokes
   and the 150ms editor debounce sits cleanly upstream of the broadcast. */

import * as React from 'react'
import {
  useDocFormFieldValue,
  useDocFormSetValue,
} from 'payload-plugin-shadcn-ui'

import { useMediaFetch } from '../editor/hooks/useMediaFetch.js'
import type { EditorBindings } from '../editor/EditorContext.js'
import {
  IDENTITY_MOCKUP_TRANSFORM,
  placementFromPrintArea,
  printAreaFromPlacement,
  type ColorMockupRow,
  type MockupTransform,
  type PrintArea,
  type PrintAreaPlacement,
  type PrintAreasValue,
  type ViewDims,
} from '../printArea.js'

export type UseEditorBindingsResult = EditorBindings & {
  /** True once the active view has resolvable physical dimensions (a template
   *  has been picked & denormalized, or custom widthMm/heightMm are filled in).
   *  The Designer gates the canvas mount on this so we don't render with a
   *  zero-size print area. */
  hasViewDims: boolean
  /** Mirror of the active row's `placementLocked` flag. Drives the broadcast
   *  banner and the chip-strip lock toggle. */
  placementLocked: boolean
  /** Sibling-row count of the active view, excluding rows with
   *  `placementLocked: true`. Drives the "applies to N colors" banner copy. */
  unlockedSiblingCount: number
}

export function useEditorBindings(
  viewIndex: number,
  colorIndex: number,
  mediaSlug: string,
  disabled?: boolean,
): UseEditorBindingsResult {
  const viewBase = `views.${viewIndex}`
  const rowBase = `${viewBase}.colorMockups.${colorIndex}`
  const placementPath = `${rowBase}.printAreaPlacement`
  const transformPath = `${rowBase}.mockupTransform`

  const placementsRaw = useDocFormFieldValue(placementPath) as
    | PrintAreaPlacement[]
    | undefined
  const transformRaw = useDocFormFieldValue(transformPath) as
    | MockupTransform
    | undefined
  const placementLockedRaw = useDocFormFieldValue(`${rowBase}.placementLocked`) as
    | boolean
    | undefined
  const colorMockupsRaw = useDocFormFieldValue(`${viewBase}.colorMockups`) as
    | ColorMockupRow[]
    | undefined

  const resolved = useDocFormFieldValue(`${viewBase}.resolvedDimsMm`) as
    | ViewDims
    | undefined
  const source = useDocFormFieldValue(`${viewBase}.printAreaSource`) as
    | 'template'
    | 'custom'
    | undefined
  const cw = useDocFormFieldValue(`${viewBase}.widthMm`) as number | undefined
  const ch = useDocFormFieldValue(`${viewBase}.heightMm`) as number | undefined
  const cb = useDocFormFieldValue(`${viewBase}.bleedMm`) as number | undefined

  const { media } = useMediaFetch(mediaSlug, `${rowBase}.mockup`)

  const viewDims = React.useMemo<ViewDims | undefined>(() => {
    if (
      resolved &&
      typeof resolved.widthMm === 'number' &&
      typeof resolved.heightMm === 'number' &&
      resolved.widthMm > 0 &&
      resolved.heightMm > 0
    ) {
      return resolved
    }
    if (source === 'custom' && cw && ch && cw > 0 && ch > 0) {
      return { widthMm: cw, heightMm: ch, ...(cb ? { bleedMm: cb } : {}) }
    }
    return undefined
  }, [resolved, source, cw, ch, cb])

  const value = React.useMemo<PrintAreasValue>(() => {
    const placements: PrintAreaPlacement[] = Array.isArray(placementsRaw)
      ? placementsRaw
      : []
    const dims: ViewDims = viewDims ?? { widthMm: 0, heightMm: 0 }
    const areas: PrintArea[] = placements.map((p) => printAreaFromPlacement(p, dims))
    return {
      naturalWidth: media?.width ?? 0,
      naturalHeight: media?.height ?? 0,
      areas,
      mockupTransform: transformRaw ?? { ...IDENTITY_MOCKUP_TRANSFORM },
    }
  }, [placementsRaw, viewDims, transformRaw, media])

  const setValueAtPath = useDocFormSetValue()

  // The editor's 150ms debounce calls `onChange` on the trailing edge. Keep
  // the callback identity stable so the debounce timer doesn't get torn down
  // on every render — sibling rows + locked flag live in refs updated each
  // render. (React hooks can't be called inside the callback.)
  const rowsRef = React.useRef<ColorMockupRow[]>([])
  rowsRef.current = Array.isArray(colorMockupsRaw) ? colorMockupsRaw : []
  const lockedRef = React.useRef(false)
  lockedRef.current = Boolean(placementLockedRaw)

  // viewIndex / colorIndex are closed over here; the Designer remounts
  // EditorProvider via key={`${view}-${color}`} on switch so a stale debounce
  // can't fire against the wrong row, but capture defensively below too.
  const onChange = React.useCallback(
    (next: PrintAreasValue) => {
      const placements = next.areas.map(placementFromPrintArea)
      setValueAtPath(transformPath, next.mockupTransform)

      if (lockedRef.current) {
        setValueAtPath(placementPath, placements)
        return
      }

      // Broadcast: write to every unlocked row of the active view, including
      // self. Locked siblings are left untouched.
      const rows = rowsRef.current
      if (rows.length === 0) {
        setValueAtPath(placementPath, placements)
        return
      }
      rows.forEach((row, j) => {
        if (j !== colorIndex && row?.placementLocked) return
        setValueAtPath(
          `${viewBase}.colorMockups.${j}.printAreaPlacement`,
          placements,
        )
      })
    },
    [setValueAtPath, viewBase, placementPath, transformPath, colorIndex],
  )

  const unlockedSiblingCount = React.useMemo(() => {
    const rows = Array.isArray(colorMockupsRaw) ? colorMockupsRaw : []
    return rows.reduce(
      (acc, row) => (row?.placementLocked ? acc : acc + 1),
      0,
    )
  }, [colorMockupsRaw])

  return {
    value,
    onChange,
    media: { slug: mediaSlug, fieldPath: `${rowBase}.mockup` },
    disabled,
    lockPerAreaMm: true,
    hasViewDims: viewDims !== undefined,
    placementLocked: Boolean(placementLockedRaw),
    unlockedSiblingCount,
  }
}

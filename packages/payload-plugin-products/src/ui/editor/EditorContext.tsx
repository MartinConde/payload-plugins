'use client'

/* Shared state + actions for the print-area editor. Everything that used to
   live as locals/refs in the monolithic PrintAreaEditor lives here, so the
   toolbar / canvas / sidebar / tabs can stay tiny presentational components.

   Owns:
   - The Fabric Canvas lifecycle (create on mockup load, dispose on unmount).
   - The mockup FabricImage (added as an interactive object, not a background,
     so the user can drag and scale it within the canvas viewport).
   - The print-area rect → form-value sync (debounced; reads always-current via
     refs to avoid the canvas-init effect re-running on every keystroke).
   - The ResizeObserver that reprojects everything when the container width
     changes, without rebuilding the canvas.
   - Keyboard delete for the active rect.

   Refs vs state — refs hold heavy/per-frame stuff (Canvas, FabricImage,
   transforms, latest props.value), state holds the bits the UI subscribes to
   (loadState, selected, mockupTransform-as-input-source). */

import * as React from 'react'
import type { Canvas, FabricImage } from 'fabric'
import { Canvas as FabricCanvas } from 'fabric'
import { useTranslation } from '@payloadcms/ui'

import {
  A_SERIES_PRESETS,
  IDENTITY_MOCKUP_TRANSFORM,
  newPrintArea,
  normalizePrintAreasValue,
  type MockupTransform,
  type PrintArea,
  type PrintAreaPreset,
  type PrintAreasValue,
} from '../printArea.js'
import {
  baselineScaleFor,
  mockupFromFabric,
  type CanvasSize,
  type NaturalSize,
} from './fabric/coords.js'
import {
  addMockupToCanvas,
  applyMockupLock,
  applyMockupTransform,
  loadMockupImage,
} from './fabric/image.js'
import { clampObjectToCanvas, wireUniformScaling } from './fabric/events.js'
import {
  applyAreaToRect,
  makeRect,
  readRectArea,
  type AreaMeta,
  type AreaRect,
} from './fabric/rect.js'
import { useMediaFetch, type LoadState, type MediaInfo } from './hooks/useMediaFetch.js'

const SYNC_DEBOUNCE_MS = 150
const RESIZE_DEBOUNCE_MS = 100
const CUSTOM_PRESET: PrintAreaPreset = { label: 'Custom', widthMm: 200, heightMm: 200 }

export type SelectedArea = { id: string } & AreaMeta
export type AlignDir = 'left' | 'centerH' | 'right' | 'top' | 'middle' | 'bottom'

export type EditorContextValue = {
  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasElRef: React.RefObject<HTMLCanvasElement | null>

  // Static-ish state
  loadState: LoadState
  media: MediaInfo | null

  // Live UI state
  selected: SelectedArea | null
  mockupTransform: MockupTransform
  /** Current canvas viewport in pixels. Drives the Image tab's px-size inputs
   *  (`renderedWidth = canvasSize.width * mockupTransform.scale`) and the
   *  mockup-alignment math. Mirrors `canvasSizeRef` for use in render. */
  canvasSize: CanvasSize
  areaCount: number
  presets: PrintAreaPreset[]

  // Actions — print areas
  addArea: (preset: PrintAreaPreset) => void
  deleteSelected: () => void
  align: (dir: AlignDir) => void
  updateSelectedName: (name: string) => void
  updateSelectedMm: (dim: 'widthMm' | 'heightMm', raw: number) => void

  // Actions — mockup image
  setMockupTransform: (next: MockupTransform | ((prev: MockupTransform) => MockupTransform)) => void
  resetMockupTransform: () => void
  toggleMockupLock: () => void
  alignMockup: (dir: AlignDir) => void

  // i18n + flags
  tr: (key: string) => string
  disabled: boolean | undefined
  /** When true, the sidebar's per-area mm inputs are read-only and
   *  `updateSelectedMm` is a no-op. Set by the Designer (Phase 2+) because
   *  physical mm now live on the view, not per-area. The legacy single-mockup
   *  adapter leaves this false so the original UX is preserved. */
  lockPerAreaMm: boolean
}

const EditorContext = React.createContext<EditorContextValue | null>(null)

export const useEditor = (): EditorContextValue => {
  const ctx = React.useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within <EditorProvider>')
  return ctx
}

/** What the Designer (or any other host) hands the editor. Replaces the old
 *  FieldInputProps coupling so the editor can run inside an array row / against
 *  view-indexed sub-fields, not only on a top-level JSON field. */
export type EditorBindings = {
  value: PrintAreasValue
  onChange: (next: PrintAreasValue) => void
  media: { slug: string; fieldPath: string }
  disabled?: boolean
  /** Phase 2+: physical mm are owned by the view, not per-area. */
  lockPerAreaMm?: boolean
}

type EditorProviderProps = {
  bindings: EditorBindings
  children: React.ReactNode
}

export function EditorProvider({ bindings, children }: EditorProviderProps): React.ReactElement {
  const { value, onChange, disabled } = bindings
  const lockPerAreaMm = bindings.lockPerAreaMm === true
  const { t } = useTranslation()
  const tr = React.useCallback((key: string): string => (t as (k: string) => string)(key), [t])

  const { loadState, media } = useMediaFetch(bindings.media.slug, bindings.media.fieldPath)

  // ── Refs (no re-render on change) ─────────────────────────────────────────
  const containerRef = React.useRef<HTMLDivElement>(null)
  const canvasElRef = React.useRef<HTMLCanvasElement>(null)
  const canvasRef = React.useRef<Canvas | null>(null)
  const mockupRef = React.useRef<FabricImage | null>(null)
  const naturalRef = React.useRef<NaturalSize>({ w: 0, h: 0 })
  const canvasSizeRef = React.useRef<CanvasSize>({ width: 0, height: 0 })
  const baselineScaleRef = React.useRef<number>(1)
  const metaRef = React.useRef<Map<string, AreaMeta>>(new Map())
  const syncTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Always-current normalized form value, read lazily by effects/handlers.
  const normalizedValue = React.useMemo(() => normalizePrintAreasValue(value), [value])
  const valueRef = React.useRef<PrintAreasValue>(normalizedValue)
  valueRef.current = normalizedValue

  // Stable callback ref so the canvas-init effect doesn't re-run when the
  // parent passes a fresh `onChange` closure each render.
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  // ── State (drives re-renders) ─────────────────────────────────────────────
  const [selected, setSelected] = React.useState<SelectedArea | null>(null)
  const [mockupTransform, setMockupTransformState] = React.useState<MockupTransform>(
    normalizedValue.mockupTransform,
  )
  const [canvasSize, setCanvasSize] = React.useState<CanvasSize>({ width: 0, height: 0 })
  const mockupTransformRef = React.useRef<MockupTransform>(mockupTransform)
  mockupTransformRef.current = mockupTransform

  // ── Geometry helpers (read-only against current refs) ─────────────────────
  /** Snapshot every print-rect's canvas geometry into a PrintArea[]. Used by
   *  syncToForm AND by the resize observer (which needs to capture the OLD
   *  geometry before reprojecting). */
  const snapshotAreas = React.useCallback((): PrintArea[] => {
    const canvas = canvasRef.current
    if (!canvas) return []
    return canvas
      .getObjects()
      .filter((o): o is AreaRect => Boolean((o as AreaRect).areaId))
      .map((rect) => {
        const meta = metaRef.current.get(rect.areaId ?? '') ?? {
          name: '',
          widthMm: CUSTOM_PRESET.widthMm,
          heightMm: CUSTOM_PRESET.heightMm,
        }
        return readRectArea(
          rect,
          meta,
          naturalRef.current,
          canvasSizeRef.current,
          mockupTransformRef.current,
          baselineScaleRef.current,
        )
      })
  }, [])

  const buildValue = React.useCallback((): PrintAreasValue => {
    const { w: nW, h: nH } = naturalRef.current
    return {
      naturalWidth: nW,
      naturalHeight: nH,
      areas: snapshotAreas(),
      mockupTransform: mockupTransformRef.current,
    }
  }, [snapshotAreas])

  const syncToForm = React.useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      onChangeRef.current(buildValue())
    }, SYNC_DEBOUNCE_MS)
  }, [buildValue])

  /** Refresh `selected` from the canvas's active object. The mockup image
   *  isn't a rect (no `areaId`) so selecting it clears the sidebar selection. */
  const refreshSelected = React.useCallback(() => {
    const rect = canvasRef.current?.getActiveObject() as AreaRect | undefined
    if (!rect?.areaId) {
      setSelected(null)
      return
    }
    const meta = metaRef.current.get(rect.areaId)
    if (meta) setSelected({ id: rect.areaId, ...meta })
  }, [])

  /** Re-apply current mockup transform to the FabricImage and reproject every
   *  rect to match. Cheap; safe to call on every Image-tab input keystroke. */
  const reprojectAll = React.useCallback(() => {
    const canvas = canvasRef.current
    const mockup = mockupRef.current
    if (!canvas) return
    const areas = snapshotAreas()
    if (mockup) {
      applyMockupTransform(
        mockup,
        canvasSizeRef.current,
        mockupTransformRef.current,
        baselineScaleRef.current,
      )
    }
    for (const obj of canvas.getObjects()) {
      const rect = obj as AreaRect
      if (!rect.areaId) continue
      const area = areas.find((a) => a.id === rect.areaId)
      if (area) {
        applyAreaToRect(
          rect,
          area,
          naturalRef.current,
          canvasSizeRef.current,
          mockupTransformRef.current,
          baselineScaleRef.current,
        )
      }
    }
    canvas.requestRenderAll()
  }, [snapshotAreas])

  // ── Canvas init / teardown (rebuilds when the loaded image changes) ───────
  React.useEffect(() => {
    if (loadState !== 'loaded' || !media || !canvasElRef.current || !containerRef.current) return
    // ResizeObserver below will reproject to the real width on first observation.
    const containerWidth = containerRef.current.clientWidth || 800

    const canvas = new FabricCanvas(canvasElRef.current, {
      selection: !disabled,
      preserveObjectStacking: true,
    })
    canvasRef.current = canvas
    naturalRef.current = { w: media.width, h: media.height }
    // Canvas is a fixed 1:1 viewport so authors always work within the same
    // boundaries regardless of mockup aspect. Mockups are fitted-inside the
    // square via `baselineScaleFor` (contain rule).
    const canvasSize: CanvasSize = { width: containerWidth, height: containerWidth }
    canvasSizeRef.current = canvasSize
    baselineScaleRef.current = baselineScaleFor(canvasSize, naturalRef.current)
    canvas.setDimensions(canvasSize)
    setCanvasSize(canvasSize)

    // Seed rects synchronously (before the image arrives) so the toolbar can
    // already add areas and the existing geometry paints immediately.
    metaRef.current = new Map()
    for (const area of valueRef.current.areas) {
      metaRef.current.set(area.id, {
        name: area.name,
        widthMm: area.widthMm,
        heightMm: area.heightMm,
      })
      canvas.add(
        makeRect(
          area,
          naturalRef.current,
          canvasSizeRef.current,
          mockupTransformRef.current,
          baselineScaleRef.current,
        ),
      )
    }
    canvas.renderAll()

    let disposed = false
    void (async () => {
      const img = await loadMockupImage(media.url, () => disposed, media.id)
      if (!img || disposed) return
      addMockupToCanvas(
        canvas,
        img,
        naturalRef.current,
        canvasSizeRef.current,
        mockupTransformRef.current,
        baselineScaleRef.current,
      )
      mockupRef.current = img
      canvas.requestRenderAll()
    })()

    const unwireUniform = wireUniformScaling(canvas)

    /* Live rect-follow during a mockup drag/scale. Without this the rects only
       jump to follow on mouseup, which feels broken. On mouse:down on the
       mockup we snapshot the rects' image-local coords; while the mockup is
       being moved/scaled we reproject the rects from that snapshot against
       the mockup's LIVE fabric props; on mouse:up we drop the snapshot. The
       state-level mockupTransform is committed once on object:modified. */
    let dragSnapshot: PrintArea[] | null = null
    const liveTransformFromMockup = (): MockupTransform => {
      const m = mockupRef.current
      if (!m) return mockupTransformRef.current
      return mockupFromFabric(
        { left: m.left ?? 0, top: m.top ?? 0, scaleX: m.scaleX ?? 1 },
        canvasSizeRef.current,
        baselineScaleRef.current,
        mockupTransformRef.current.locked,
      )
    }
    const followMockup = () => {
      if (!dragSnapshot) return
      const liveMt = liveTransformFromMockup()
      for (const obj of canvas.getObjects()) {
        const rect = obj as AreaRect
        if (!rect.areaId) continue
        const area = dragSnapshot.find((a) => a.id === rect.areaId)
        if (area) {
          applyAreaToRect(
            rect,
            area,
            naturalRef.current,
            canvasSizeRef.current,
            liveMt,
            baselineScaleRef.current,
          )
        }
      }
      canvas.requestRenderAll()
    }
    canvas.on('mouse:down', (opt) => {
      if (opt.target && opt.target === mockupRef.current) {
        dragSnapshot = snapshotAreas()
      }
    })
    /* Clamp first so the followMockup reprojection reads already-bounded
       coords. Mockup AND print rects are constrained; the uniform-scale
       handler is wired separately and runs before this clamp. */
    canvas.on('object:moving', (e) => {
      if (!e.target) return
      clampObjectToCanvas(e.target, canvasSizeRef.current)
      if (e.target === mockupRef.current) followMockup()
    })
    canvas.on('object:scaling', (e) => {
      if (!e.target) return
      clampObjectToCanvas(e.target, canvasSizeRef.current)
      if (e.target === mockupRef.current) followMockup()
    })
    canvas.on('mouse:up', () => {
      dragSnapshot = null
    })

    /* Commit modified geometry to form value on mouseup. Distinguishes mockup
       vs rect mods: mockup edits also drive the React `mockupTransform` state
       so the Image-tab inputs stay live. */
    const onModified = (e: { target?: { type?: string } }) => {
      const target = e.target as AreaRect | FabricImage | undefined
      if (!target) return
      if (target === mockupRef.current) {
        const fab = target as FabricImage
        const nextMt = mockupFromFabric(
          { left: fab.left ?? 0, top: fab.top ?? 0, scaleX: fab.scaleX ?? 1 },
          canvasSizeRef.current,
          baselineScaleRef.current,
          mockupTransformRef.current.locked,
        )
        mockupTransformRef.current = nextMt
        setMockupTransformState(nextMt)
        // Final reproject ensures rects sit exactly where the snapshot put
        // them (cancels any sub-pixel drift from interim renders).
        reprojectAll()
      }
      syncToForm()
    }
    canvas.on('object:modified', onModified)
    canvas.on('selection:created', refreshSelected)
    canvas.on('selection:updated', refreshSelected)
    canvas.on('selection:cleared', () => setSelected(null))

    return () => {
      disposed = true
      unwireUniform()
      canvas.dispose()
      canvasRef.current = null
      mockupRef.current = null
    }
  }, [loadState, media, disabled, syncToForm, refreshSelected, reprojectAll])

  // ── Reproject on container resize (no canvas rebuild) ─────────────────────
  React.useEffect(() => {
    const container = containerRef.current
    if (!container || loadState !== 'loaded') return
    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const canvas = canvasRef.current
        if (!canvas || naturalRef.current.w <= 0) return
        const width = container.clientWidth
        if (width <= 0) return
        // Capture old normalized coords before we change the baseline scale.
        const snapshot = snapshotAreas()
        // Keep the 1:1 viewport on resize so the drag-clamp / alignment math
        // stays predictable and the work surface doesn't reflow.
        const newCanvasSize: CanvasSize = { width, height: width }
        canvasSizeRef.current = newCanvasSize
        baselineScaleRef.current = baselineScaleFor(newCanvasSize, naturalRef.current)
        canvas.setDimensions(newCanvasSize)
        setCanvasSize(newCanvasSize)
        if (mockupRef.current) {
          applyMockupTransform(
            mockupRef.current,
            newCanvasSize,
            mockupTransformRef.current,
            baselineScaleRef.current,
          )
        }
        for (const obj of canvas.getObjects()) {
          const rect = obj as AreaRect
          if (!rect.areaId) continue
          const area = snapshot.find((a) => a.id === rect.areaId)
          if (area) {
            applyAreaToRect(
              rect,
              area,
              naturalRef.current,
              newCanvasSize,
              mockupTransformRef.current,
              baselineScaleRef.current,
            )
          }
        }
        canvas.requestRenderAll()
      }, RESIZE_DEBOUNCE_MS)
    })
    observer.observe(container)
    return () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    }
  }, [loadState, snapshotAreas])

  // ── Toolbar / sidebar actions ─────────────────────────────────────────────
  const addArea = React.useCallback(
    (preset: PrintAreaPreset) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const area = newPrintArea(preset, {
        naturalWidth: naturalRef.current.w,
        naturalHeight: naturalRef.current.h,
      })
      metaRef.current.set(area.id, {
        name: area.name,
        widthMm: area.widthMm,
        heightMm: area.heightMm,
      })
      const rect = makeRect(
        area,
        naturalRef.current,
        canvasSizeRef.current,
        mockupTransformRef.current,
        baselineScaleRef.current,
      )
      canvas.add(rect)
      canvas.setActiveObject(rect)
      canvas.requestRenderAll()
      setSelected({ id: area.id, name: area.name, widthMm: area.widthMm, heightMm: area.heightMm })
      syncToForm()
    },
    [syncToForm],
  )

  const deleteSelected = React.useCallback(() => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject() as AreaRect | undefined
    if (!canvas || !active?.areaId) return
    metaRef.current.delete(active.areaId)
    canvas.remove(active)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    setSelected(null)
    syncToForm()
  }, [syncToForm])

  const align = React.useCallback(
    (dir: AlignDir) => {
      const canvas = canvasRef.current
      const rect = canvas?.getActiveObject() as AreaRect | undefined
      if (!canvas || !rect?.areaId) return
      const cw = canvas.getWidth()
      const ch = canvas.getHeight()
      const aw = (rect.width ?? 0) * (rect.scaleX ?? 1)
      const ah = (rect.height ?? 0) * (rect.scaleY ?? 1)
      switch (dir) {
        case 'left':
          rect.set('left', 0)
          break
        case 'centerH':
          rect.set('left', (cw - aw) / 2)
          break
        case 'right':
          rect.set('left', cw - aw)
          break
        case 'top':
          rect.set('top', 0)
          break
        case 'middle':
          rect.set('top', (ch - ah) / 2)
          break
        case 'bottom':
          rect.set('top', ch - ah)
          break
      }
      rect.setCoords()
      canvas.requestRenderAll()
      syncToForm()
    },
    [syncToForm],
  )

  const updateSelectedName = React.useCallback(
    (name: string) => {
      setSelected((prev) => (prev ? { ...prev, name } : prev))
      const rect = canvasRef.current?.getActiveObject() as AreaRect | undefined
      if (!rect?.areaId) return
      const meta = metaRef.current.get(rect.areaId)
      if (meta) metaRef.current.set(rect.areaId, { ...meta, name })
      syncToForm()
    },
    [syncToForm],
  )

  const updateSelectedMm = React.useCallback(
    (dim: 'widthMm' | 'heightMm', raw: number) => {
      if (lockPerAreaMm) return
      const mm = Number.isFinite(raw) && raw > 0 ? raw : 1
      setSelected((prev) => (prev ? { ...prev, [dim]: mm } : prev))
      const canvas = canvasRef.current
      const rect = canvas?.getActiveObject() as AreaRect | undefined
      if (!canvas || !rect?.areaId) return
      const meta = metaRef.current.get(rect.areaId)
      if (!meta) return
      const next = { ...meta, [dim]: mm }
      metaRef.current.set(rect.areaId, next)
      // Re-lock the rect's pixel aspect to the new mm aspect: keep width,
      // recompute height. scaleX === scaleY, so width/height ratio = mm ratio.
      const mmAspect = next.widthMm / next.heightMm
      rect.set('height', (rect.width ?? 0) / mmAspect)
      rect.setCoords()
      canvas.requestRenderAll()
      syncToForm()
    },
    [syncToForm, lockPerAreaMm],
  )

  // ── Mockup-image actions ──────────────────────────────────────────────────
  const setMockupTransform = React.useCallback(
    (next: MockupTransform | ((prev: MockupTransform) => MockupTransform)) => {
      setMockupTransformState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        mockupTransformRef.current = resolved
        // Reproject in a microtask so the new state is committed before the
        // next render — keeps Image-tab number inputs feeling live.
        Promise.resolve().then(() => {
          reprojectAll()
          syncToForm()
        })
        return resolved
      })
    },
    [reprojectAll, syncToForm],
  )

  const resetMockupTransform = React.useCallback(() => {
    setMockupTransform({ ...IDENTITY_MOCKUP_TRANSFORM, locked: mockupTransformRef.current.locked })
  }, [setMockupTransform])

  /* Mockup alignment — same six directions as the print-area buttons. The
     mockup's rendered size depends on the image's natural aspect (fit-inside
     baseline), so the fraction of the canvas it covers is `natural * baseline
     * scale / canvas`, NOT just `scale`. Centering reduces to
     `(1 - renderedFrac) / 2` against that real fraction. */
  const alignMockup = React.useCallback(
    (dir: AlignDir) => {
      const natural = naturalRef.current
      const { width: cw, height: ch } = canvasSizeRef.current
      if (cw <= 0 || ch <= 0) return
      const baseline = baselineScaleRef.current
      const scale = mockupTransformRef.current.scale
      const wFrac = (natural.w * baseline * scale) / cw
      const hFrac = (natural.h * baseline * scale) / ch
      setMockupTransform((prev) => {
        switch (dir) {
          case 'left':
            return { ...prev, x: 0 }
          case 'centerH':
            return { ...prev, x: (1 - wFrac) / 2 }
          case 'right':
            return { ...prev, x: 1 - wFrac }
          case 'top':
            return { ...prev, y: 0 }
          case 'middle':
            return { ...prev, y: (1 - hFrac) / 2 }
          case 'bottom':
            return { ...prev, y: 1 - hFrac }
        }
      })
    },
    [setMockupTransform],
  )

  const toggleMockupLock = React.useCallback(() => {
    setMockupTransformState((prev) => {
      const next = { ...prev, locked: !prev.locked }
      mockupTransformRef.current = next
      if (mockupRef.current) applyMockupLock(mockupRef.current, next.locked)
      canvasRef.current?.requestRenderAll()
      Promise.resolve().then(() => syncToForm())
      return next
    })
  }, [syncToForm])

  // ── Keyboard: delete selected rect ────────────────────────────────────────
  React.useEffect(() => {
    if (disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        return
      }
      const active = canvasRef.current?.getActiveObject() as AreaRect | undefined
      if (active?.areaId) {
        e.preventDefault()
        deleteSelected()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [disabled, deleteSelected])

  React.useEffect(
    () => () => {
      if (syncTimer.current) clearTimeout(syncTimer.current)
    },
    [],
  )

  const presets = React.useMemo(() => [...A_SERIES_PRESETS, CUSTOM_PRESET], [])
  const areaCount = normalizedValue.areas.length

  const ctxValue: EditorContextValue = {
    containerRef,
    canvasElRef,
    loadState,
    media,
    selected,
    mockupTransform,
    canvasSize,
    areaCount,
    presets,
    addArea,
    deleteSelected,
    align,
    updateSelectedName,
    updateSelectedMm,
    setMockupTransform,
    resetMockupTransform,
    toggleMockupLock,
    alignMockup,
    tr,
    disabled,
    lockPerAreaMm,
  }

  return <EditorContext.Provider value={ctxValue}>{children}</EditorContext.Provider>
}

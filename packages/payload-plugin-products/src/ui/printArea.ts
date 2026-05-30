/* Node-safe print-area model + pure helpers, shared between the server config
   graph (collection field hook, index barrel) and the browser Fabric editor.
   Imports NOTHING from `@payloadcms/ui`, `fabric`, or React — so it is safe to
   pull into the Payload CLI's Node config load.

   Geometry contract (so the frontend can re-derive artwork placement):
   coordinates are stored NORMALIZED 0..1 relative to the mockup's NATURAL pixel
   size, with origin at the rect's top-left (`originX:'left', originY:'top'`).
   Given a display scale `s = displayWidth / naturalWidth`, the on-screen rect is
     left   = x * naturalWidth  * s
     top    = y * naturalHeight * s
     width  = w * naturalWidth   (then scaled by s on the canvas)
     height = h * naturalHeight  (then scaled by s on the canvas)
   `rotation` is degrees clockwise about the rect's top-left corner.

   `widthMm`/`heightMm` are the real-world physical size of the print area. They
   are the source of truth for the rect's aspect ratio (the editor locks the
   on-canvas rect to `widthMm / heightMm`) and are kept as metadata for later
   DPI / artwork-fit checks. */

/**
 * Legacy combined print-area shape (geometry + physical mm). Still the
 * on-the-wire JSON used by the single-mockup Fabric editor and by the
 * v0.1 `printAreas` collection field.
 *
 * @deprecated Use {@link PrintAreaPlacement} + {@link ViewDims} (Phase 2 views).
 */
export type PrintArea = {
  /** Stable id (crypto.randomUUID). */
  id: string
  /** Editor-set label, e.g. "Front A4". */
  name: string
  /** Real-world physical width (mm) — aspect-lock source. */
  widthMm: number
  /** Real-world physical height (mm). */
  heightMm: number
  /** Normalized 0..1: top-left X of the unrotated bbox / naturalWidth. */
  x: number
  /** Normalized 0..1: top-left Y of the unrotated bbox / naturalHeight. */
  y: number
  /** Normalized 0..1: bbox width / naturalWidth. */
  w: number
  /** Normalized 0..1: bbox height / naturalHeight. */
  h: number
  /** Degrees clockwise, about the rect's top-left origin. */
  rotation: number
}

/** Geometry-only slice of a print area: id, name, normalized rect, rotation.
 *  Carries no mm — physical dimensions live on the owning view ({@link ViewDims}). */
export type PrintAreaPlacement = Omit<PrintArea, 'widthMm' | 'heightMm'>

/** Physical dimensions of a print view (mm). Source of truth for aspect lock
 *  and downstream DPI / artwork-fit checks. */
export type ViewDims = {
  widthMm: number
  heightMm: number
  bleedMm?: number
}

/* On-canvas placement of the mockup image itself. The mockup is no longer
   pinned to the canvas as `backgroundImage`; the editor adds it as a regular
   FabricObject so authors can drag and scale it within the canvas viewport.
   Stored normalized so the JSON stays portable across canvas-container
   resizes:
     `x` / `y` — top-left offset of the mockup as a fraction of the canvas's
                 current width / height (so 0/0 = pinned to top-left, 0.1/0.1
                 = shifted 10% down-right).
     `scale`   — multiplier on the baseline "fit-to-canvas" scale. 1 = exactly
                 the legacy fill-the-canvas behaviour. Range clamped to [0.1,4]
                 on read.
     `locked`  — when true, the mockup becomes non-selectable + non-evented so
                 the user can't bump it while editing rects. Print rects are
                 always editable.
   Rotation deliberately omitted from the first cut: print rects assume an
   axis-aligned mockup. */
export type MockupTransform = {
  x: number
  y: number
  scale: number
  locked: boolean
}

export const IDENTITY_MOCKUP_TRANSFORM: MockupTransform = {
  x: 0,
  y: 0,
  scale: 1,
  locked: false,
}

export type PrintAreasValue = {
  /** Natural pixel width of the mockup (media.width) the areas were laid out on. */
  naturalWidth: number
  /** Natural pixel height of the mockup (media.height). */
  naturalHeight: number
  areas: PrintArea[]
  /** Mockup image placement on the canvas; identity = fit-to-canvas. */
  mockupTransform: MockupTransform
}

export type PrintAreaPreset = {
  label: string
  widthMm: number
  heightMm: number
}

/** ISO 216 A-series, portrait millimetres. Offered as quick presets; the editor
 *  also allows free custom mm entry. */
export const A_SERIES_PRESETS: PrintAreaPreset[] = [
  { label: 'A6', widthMm: 105, heightMm: 148 },
  { label: 'A5', widthMm: 148, heightMm: 210 },
  { label: 'A4', widthMm: 210, heightMm: 297 },
  { label: 'A3', widthMm: 297, heightMm: 420 },
  { label: 'A2', widthMm: 420, heightMm: 594 },
]

/** Physical aspect ratio (width / height) of a print area, in mm. */
export const aspectOf = (a: Pick<PrintArea, 'widthMm' | 'heightMm'>): number =>
  a.heightMm > 0 ? a.widthMm / a.heightMm : 1

/** Physical aspect ratio (width / height) from view dims. Mirrors `aspectOf`
 *  for the geometry-split world. */
export const aspectFromDims = (d: ViewDims): number =>
  d.heightMm > 0 ? d.widthMm / d.heightMm : 1

/** Project a legacy PrintArea down to its geometry-only placement. */
export const placementFromPrintArea = (a: PrintArea): PrintAreaPlacement => ({
  id: a.id,
  name: a.name,
  x: a.x,
  y: a.y,
  w: a.w,
  h: a.h,
  rotation: a.rotation,
})

/** Compose a legacy PrintArea from a placement + view dims. Used by the
 *  adapter that bridges the geometry-split model back into PrintAreasValue
 *  for the unchanged Fabric editor. */
export const printAreaFromPlacement = (
  p: PrintAreaPlacement,
  dims: ViewDims,
): PrintArea => ({
  id: p.id,
  name: p.name,
  widthMm: dims.widthMm,
  heightMm: dims.heightMm,
  x: p.x,
  y: p.y,
  w: p.w,
  h: p.h,
  rotation: p.rotation,
})

const EMPTY_VALUE: PrintAreasValue = {
  naturalWidth: 0,
  naturalHeight: 0,
  areas: [],
  mockupTransform: { ...IDENTITY_MOCKUP_TRANSFORM },
}

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v

const MOCKUP_SCALE_MIN = 0.1
const MOCKUP_SCALE_MAX = 4
const MOCKUP_OFFSET_MIN = -2
const MOCKUP_OFFSET_MAX = 3

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

/** Coerce one stored entry into a geometry-only PrintAreaPlacement, or null if
 *  unusable. Shared by the legacy mm-enforcing normalizer below and by the
 *  new placement sanitizers. */
const normalizeGeometry = (raw: unknown): PrintAreaPlacement | null => {
  if (!isObj(raw)) return null
  const w = clamp01(num(raw.w))
  const h = clamp01(num(raw.h))
  if (w <= 0 || h <= 0) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    name: typeof raw.name === 'string' ? raw.name : '',
    x: clamp01(num(raw.x)),
    y: clamp01(num(raw.y)),
    w,
    h,
    rotation: num(raw.rotation),
  }
}

/** Coerce one stored entry into a clean PrintArea, or null if unusable. */
const normalizeArea = (raw: unknown): PrintArea | null => {
  if (!isObj(raw)) return null
  const widthMm = num(raw.widthMm)
  const heightMm = num(raw.heightMm)
  if (widthMm <= 0 || heightMm <= 0) return null
  const geo = normalizeGeometry(raw)
  if (!geo) return null
  return { ...geo, widthMm, heightMm }
}

/** Sanitize a single geometry-only placement, returning null if unusable. */
export const normalizePlacement = (raw: unknown): PrintAreaPlacement | null =>
  normalizeGeometry(raw)

/** Sanitize an array of placements, dropping any unusable entries. */
export const normalizePlacements = (raw: unknown): PrintAreaPlacement[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map(normalizeGeometry)
    .filter((p): p is PrintAreaPlacement => p !== null)
}

/** Coerce a stored mockup-transform sub-object into a sanitised MockupTransform,
 *  defaulting to identity. Tolerates missing fields so docs saved before the
 *  feature landed keep rendering correctly (`mockupTransform` absent → identity).
 *  Out-of-range values are clamped, not rejected. */
export const normalizeMockupTransform = (raw: unknown): MockupTransform => {
  if (!isObj(raw)) return { ...IDENTITY_MOCKUP_TRANSFORM }
  return {
    x: clamp(num(raw.x, 0), MOCKUP_OFFSET_MIN, MOCKUP_OFFSET_MAX),
    y: clamp(num(raw.y, 0), MOCKUP_OFFSET_MIN, MOCKUP_OFFSET_MAX),
    scale: clamp(num(raw.scale, 1), MOCKUP_SCALE_MIN, MOCKUP_SCALE_MAX),
    locked: raw.locked === true,
  }
}

/** Coerce any stored/garbage value into a clean PrintAreasValue POJO. Used by
 *  the editor on load AND by the collection's `beforeChange` sanitizer, so a
 *  direct REST write can never persist malformed geometry. Never returns
 *  undefined/Dates/functions — safe for the D1 (SQLite) json text column. */
export const normalizePrintAreasValue = (value: unknown): PrintAreasValue => {
  if (!isObj(value)) return { ...EMPTY_VALUE, mockupTransform: { ...IDENTITY_MOCKUP_TRANSFORM } }
  const areasRaw = Array.isArray(value.areas) ? value.areas : []
  const areas = areasRaw
    .map(normalizeArea)
    .filter((a): a is PrintArea => a !== null)
  return {
    naturalWidth: Math.max(0, Math.round(num(value.naturalWidth))),
    naturalHeight: Math.max(0, Math.round(num(value.naturalHeight))),
    areas,
    mockupTransform: normalizeMockupTransform(value.mockupTransform),
  }
}

/** A single color row inside a view's `colorMockups` array (Phase 3). One
 *  row per (view, color); reconciled against the product-level `colors[]`
 *  relationship by {@link reconcileColorMockupsPure}. */
export type ColorMockupRow = {
  /** Stable row id, used as a React key and for client-side row diffing. */
  id: string
  /** Relationship value to a `color-swatches` doc. Payload may store this as
   *  a bare id (`string`/`number`) or as a populated object — both shapes are
   *  accepted on read; we normalize to a string id when comparing. */
  color: unknown
  /** Upload relationship to the media collection. `null` until uploaded. */
  mockup: unknown
  /** Mockup canvas transform for this row. See {@link MockupTransform}. */
  mockupTransform: MockupTransform
  /** Print-area placements for this row. Broadcast to siblings when this
   *  row's `placementLocked` is false. */
  printAreaPlacement: PrintAreaPlacement[]
  /** When true, placement edits on sibling rows of the same view do NOT
   *  overwrite this row; this row keeps its own placement. */
  placementLocked: boolean
}

/** A row in the products `views[]` array. Phase 2 stored mockup + transform +
 *  placement directly here; Phase 3 moves them into the per-color
 *  `colorMockups[]` sub-array and keeps physical dims on the view. */
export type ViewRow = {
  id?: string
  name?: string
  printAreaSource?: 'template' | 'custom'
  printAreaTemplate?: unknown
  widthMm?: number | null
  heightMm?: number | null
  bleedMm?: number | null
  resolvedDimsMm?: ViewDims
  colorMockups?: ColorMockupRow[]
  [key: string]: unknown
}

/** Resolve a Payload relationship value to its id, preserving the original
 *  `string | number` type (so callers that match against the DB keep numeric
 *  ids). Accepts a bare id, a populated `{ id }` envelope, or null/garbage.
 *  Single source of truth — the collection hook and the v0.2 migration both
 *  import this. */
export const refToId = (raw: unknown): string | number | null => {
  if (raw == null) return null
  if (typeof raw === 'string' || typeof raw === 'number') return raw
  if (typeof raw === 'object') {
    const id = (raw as Record<string, unknown>).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return null
}

// String-coerced flavour used internally for Set/Map keying.
const colorRefToId = (raw: unknown): string | null => {
  const id = refToId(raw)
  return id == null ? null : String(id)
}

const emptyColorMockupRow = (colorId: string): ColorMockupRow => ({
  id: crypto.randomUUID(),
  color: colorId,
  mockup: null,
  mockupTransform: { ...IDENTITY_MOCKUP_TRANSFORM },
  printAreaPlacement: [],
  placementLocked: false,
})

/** Reconcile `views[].colorMockups` against the product-level `colors[]`.
 *
 *  For each view:
 *    1. Build an index of existing rows by their resolved color id (relationship
 *       envelopes accepted on both sides).
 *    2. Walk `colorIds` in order. For each id, take the existing row if
 *       present (preserving its uploaded mockup / transform / placement /
 *       lock flag), otherwise emit a fresh empty row.
 *    3. Drop rows whose `color` is unset or no longer in `colorIds`.
 *
 *  Idempotent: a second call with the same input produces the same output
 *  (same row ids preserved, no fresh uuid churn) because identity is the
 *  color id, not the array index. Used by both the collection `beforeChange`
 *  hook and the `+ Add color` client handler so the chip is clickable
 *  immediately, before the next save runs the server-side reconcile. */
export function reconcileColorMockupsPure(
  colorIds: ReadonlyArray<string>,
  views: ReadonlyArray<ViewRow>,
): ViewRow[] {
  const wanted = colorIds.map((c) => String(c))
  const wantedSet = new Set(wanted)
  return views.map((view) => {
    const existing = Array.isArray(view?.colorMockups) ? view.colorMockups : []
    const byColor = new Map<string, ColorMockupRow>()
    for (const row of existing) {
      const id = colorRefToId(row?.color)
      if (id != null && wantedSet.has(id) && !byColor.has(id)) {
        byColor.set(id, row)
      }
    }
    const next: ColorMockupRow[] = wanted.map(
      (id) => byColor.get(id) ?? emptyColorMockupRow(id),
    )
    return { ...view, colorMockups: next }
  })
}

/** Re-fit every placement's w/h to a new physical aspect, keeping each rect's
 *  pixel-space CENTER fixed. The on-canvas rect's pixel aspect = (w/h) *
 *  naturalAspect, and it must equal the view's mm aspect — so when the view's
 *  mm change, every rect must be re-snapped or the editor will look wrong on
 *  the next mount.
 *
 *  Per placement:
 *    cx = x + w/2, cy = y + h/2
 *    area = w * h
 *    ratio = newMmAspect / naturalAspect    // target w/h
 *    h' = sqrt(area / ratio); w' = h' * ratio
 *    clamp w'/h' into [0..1], then re-center around (cx, cy) with x'/y' clamped.
 *
 *  Caller passes `naturalAspect = naturalWidth / naturalHeight` (1 if unknown);
 *  result is independent of the OLD mm dims (the math derives entirely from
 *  the existing rect's area + the new target ratio), so the helper signature
 *  intentionally drops the `oldDims` parameter from the task brief.
 *
 *  Returns a NEW array; callers replace per-row placement wholesale. Locked
 *  rows are filtered out at the call site, not here.
 */
export function snapPlacementsToAspect(
  placements: ReadonlyArray<PrintAreaPlacement>,
  newDims: ViewDims,
  naturalAspect: number,
): PrintAreaPlacement[] {
  if (!Array.isArray(placements) || placements.length === 0) return []
  const mmAspect = aspectFromDims(newDims)
  if (!(mmAspect > 0) || !Number.isFinite(mmAspect)) {
    return placements.map((p) => ({ ...p }))
  }
  const safeNatural =
    typeof naturalAspect === 'number' && naturalAspect > 0 && Number.isFinite(naturalAspect)
      ? naturalAspect
      : 1
  const ratio = mmAspect / safeNatural // target w/h in normalized coords
  return placements.map((p) => {
    const w0 = clamp01(num(p.w))
    const h0 = clamp01(num(p.h))
    if (w0 <= 0 || h0 <= 0) return { ...p }
    const cx = clamp01(num(p.x) + w0 / 2)
    const cy = clamp01(num(p.y) + h0 / 2)
    const area = w0 * h0
    let hNew = Math.sqrt(area / ratio)
    let wNew = hNew * ratio
    // Shrink to fit unit square if either dim overflows.
    if (wNew > 1) {
      const k = 1 / wNew
      wNew = 1
      hNew = hNew * k
    }
    if (hNew > 1) {
      const k = 1 / hNew
      hNew = 1
      wNew = wNew * k
    }
    const xNew = clamp01(cx - wNew / 2)
    const yNew = clamp01(cy - hNew / 2)
    return {
      ...p,
      x: clamp01(Math.min(xNew, 1 - wNew)),
      y: clamp01(Math.min(yNew, 1 - hNew)),
      w: clamp01(wNew),
      h: clamp01(hNew),
    }
  })
}

/** Build a new print area for `preset`, centered on the mockup at a sensible
 *  default size. The on-canvas rect's PIXEL aspect must equal the physical mm
 *  aspect, so the normalized w/h are derived against the mockup's natural dims
 *  (which have their own pixel aspect). */
export const newPrintArea = (
  preset: PrintAreaPreset,
  natural: { naturalWidth: number; naturalHeight: number },
): PrintArea => {
  const { naturalWidth, naturalHeight } = natural
  const mmAspect = preset.widthMm / preset.heightMm // target pixel w/h
  // Start at ~35% of the image width, then cap height to 60% of image height.
  let pxW = naturalWidth * 0.35
  let pxH = pxW / mmAspect
  if (pxH > naturalHeight * 0.6) {
    pxH = naturalHeight * 0.6
    pxW = pxH * mmAspect
  }
  const w = naturalWidth > 0 ? clamp01(pxW / naturalWidth) : 0.35
  const h = naturalHeight > 0 ? clamp01(pxH / naturalHeight) : 0.35
  return {
    id: crypto.randomUUID(),
    name: preset.label,
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    x: clamp01((1 - w) / 2),
    y: clamp01((1 - h) / 2),
    w,
    h,
    rotation: 0,
  }
}

/**
 * Legacy combined print-area shape (geometry + physical mm). Still the
 * on-the-wire JSON used by the single-mockup Fabric editor and by the
 * v0.1 `printAreas` collection field.
 *
 * @deprecated Use {@link PrintAreaPlacement} + {@link ViewDims} (Phase 2 views).
 */
export type PrintArea = {
    /** Stable id (crypto.randomUUID). */
    id: string;
    /** Editor-set label, e.g. "Front A4". */
    name: string;
    /** Real-world physical width (mm) — aspect-lock source. */
    widthMm: number;
    /** Real-world physical height (mm). */
    heightMm: number;
    /** Normalized 0..1: top-left X of the unrotated bbox / naturalWidth. */
    x: number;
    /** Normalized 0..1: top-left Y of the unrotated bbox / naturalHeight. */
    y: number;
    /** Normalized 0..1: bbox width / naturalWidth. */
    w: number;
    /** Normalized 0..1: bbox height / naturalHeight. */
    h: number;
    /** Degrees clockwise, about the rect's top-left origin. */
    rotation: number;
};
/** Geometry-only slice of a print area: id, name, normalized rect, rotation.
 *  Carries no mm — physical dimensions live on the owning view ({@link ViewDims}). */
export type PrintAreaPlacement = Omit<PrintArea, 'widthMm' | 'heightMm'>;
/** Physical dimensions of a print view (mm). Source of truth for aspect lock
 *  and downstream DPI / artwork-fit checks. */
export type ViewDims = {
    widthMm: number;
    heightMm: number;
    bleedMm?: number;
};
export type MockupTransform = {
    x: number;
    y: number;
    scale: number;
    locked: boolean;
};
export declare const IDENTITY_MOCKUP_TRANSFORM: MockupTransform;
export type PrintAreasValue = {
    /** Natural pixel width of the mockup (media.width) the areas were laid out on. */
    naturalWidth: number;
    /** Natural pixel height of the mockup (media.height). */
    naturalHeight: number;
    areas: PrintArea[];
    /** Mockup image placement on the canvas; identity = fit-to-canvas. */
    mockupTransform: MockupTransform;
};
export type PrintAreaPreset = {
    label: string;
    widthMm: number;
    heightMm: number;
};
/** ISO 216 A-series, portrait millimetres. Offered as quick presets; the editor
 *  also allows free custom mm entry. */
export declare const A_SERIES_PRESETS: PrintAreaPreset[];
/** Physical aspect ratio (width / height) of a print area, in mm. */
export declare const aspectOf: (a: Pick<PrintArea, "widthMm" | "heightMm">) => number;
/** Physical aspect ratio (width / height) from view dims. Mirrors `aspectOf`
 *  for the geometry-split world. */
export declare const aspectFromDims: (d: ViewDims) => number;
/** Project a legacy PrintArea down to its geometry-only placement. */
export declare const placementFromPrintArea: (a: PrintArea) => PrintAreaPlacement;
/** Compose a legacy PrintArea from a placement + view dims. Used by the
 *  adapter that bridges the geometry-split model back into PrintAreasValue
 *  for the unchanged Fabric editor. */
export declare const printAreaFromPlacement: (p: PrintAreaPlacement, dims: ViewDims) => PrintArea;
/** Sanitize a single geometry-only placement, returning null if unusable. */
export declare const normalizePlacement: (raw: unknown) => PrintAreaPlacement | null;
/** Sanitize an array of placements, dropping any unusable entries. */
export declare const normalizePlacements: (raw: unknown) => PrintAreaPlacement[];
/** Coerce a stored mockup-transform sub-object into a sanitised MockupTransform,
 *  defaulting to identity. Tolerates missing fields so docs saved before the
 *  feature landed keep rendering correctly (`mockupTransform` absent → identity).
 *  Out-of-range values are clamped, not rejected. */
export declare const normalizeMockupTransform: (raw: unknown) => MockupTransform;
/** Coerce any stored/garbage value into a clean PrintAreasValue POJO. Used by
 *  the editor on load AND by the collection's `beforeChange` sanitizer, so a
 *  direct REST write can never persist malformed geometry. Never returns
 *  undefined/Dates/functions — safe for the D1 (SQLite) json text column. */
export declare const normalizePrintAreasValue: (value: unknown) => PrintAreasValue;
/** A single color row inside a view's `colorMockups` array (Phase 3). One
 *  row per (view, color); reconciled against the product-level `colors[]`
 *  relationship by {@link reconcileColorMockupsPure}. */
export type ColorMockupRow = {
    /** Stable row id, used as a React key and for client-side row diffing. */
    id: string;
    /** Relationship value to a `color-swatches` doc. Payload may store this as
     *  a bare id (`string`/`number`) or as a populated object — both shapes are
     *  accepted on read; we normalize to a string id when comparing. */
    color: unknown;
    /** Upload relationship to the media collection. `null` until uploaded. */
    mockup: unknown;
    /** Mockup canvas transform for this row. See {@link MockupTransform}. */
    mockupTransform: MockupTransform;
    /** Print-area placements for this row. Broadcast to siblings when this
     *  row's `placementLocked` is false. */
    printAreaPlacement: PrintAreaPlacement[];
    /** When true, placement edits on sibling rows of the same view do NOT
     *  overwrite this row; this row keeps its own placement. */
    placementLocked: boolean;
};
/** A row in the products `views[]` array. Phase 2 stored mockup + transform +
 *  placement directly here; Phase 3 moves them into the per-color
 *  `colorMockups[]` sub-array and keeps physical dims on the view. */
export type ViewRow = {
    id?: string;
    name?: string;
    printAreaSource?: 'template' | 'custom';
    printAreaTemplate?: unknown;
    widthMm?: number | null;
    heightMm?: number | null;
    bleedMm?: number | null;
    resolvedDimsMm?: ViewDims;
    colorMockups?: ColorMockupRow[];
    [key: string]: unknown;
};
/** Resolve a Payload relationship value to its id, preserving the original
 *  `string | number` type (so callers that match against the DB keep numeric
 *  ids). Accepts a bare id, a populated `{ id }` envelope, or null/garbage.
 *  Single source of truth — the collection hook and the v0.2 migration both
 *  import this. */
export declare const refToId: (raw: unknown) => string | number | null;
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
export declare function reconcileColorMockupsPure(colorIds: ReadonlyArray<string>, views: ReadonlyArray<ViewRow>): ViewRow[];
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
export declare function snapPlacementsToAspect(placements: ReadonlyArray<PrintAreaPlacement>, newDims: ViewDims, naturalAspect: number): PrintAreaPlacement[];
/** Build a new print area for `preset`, centered on the mockup at a sensible
 *  default size. The on-canvas rect's PIXEL aspect must equal the physical mm
 *  aspect, so the normalized w/h are derived against the mockup's natural dims
 *  (which have their own pixel aspect). */
export declare const newPrintArea: (preset: PrintAreaPreset, natural: {
    naturalWidth: number;
    naturalHeight: number;
}) => PrintArea;

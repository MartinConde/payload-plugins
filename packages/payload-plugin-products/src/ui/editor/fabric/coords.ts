/* Pure coordinate math for the print-area editor — no React, no Fabric.

   Two coordinate systems live side by side:

   1. **Image-local normalized** (`PrintArea.x|y|w|h`): 0..1 fractions of the
      mockup's natural pixel dimensions. This is what we persist; it's stable
      across container resizes and mockup placement changes.

   2. **Canvas pixel coords**: where Fabric actually renders things. Depends
      on the current canvas size and the user's mockup transform.

   The mockup itself is placed on the canvas via a `MockupTransform`:
     - `x`, `y` — top-left offset, normalized to canvas width / height.
     - `scale` — multiplier on the "fit-to-canvas" baseline scale.
     - (rotation deliberately not part of the first cut.)

   Given those, a print rect's canvas geometry is:
     left   = canvasW * mockup.x + (area.x * naturalW) * effScale
     top    = canvasH * mockup.y + (area.y * naturalH) * effScale
     width  = area.w * naturalW                  (then scaled by effScale)
     height = area.h * naturalH                  (then scaled by effScale)

   where `effScale = baselineScale * mockup.scale`. The width/height-vs-scale
   split mirrors Fabric's own model: `width` is the "logical" size and the
   render is `width * scaleX`. We keep `scaleX === scaleY === effScale` so the
   rect's pixel aspect stays equal to the mm aspect (already enforced by the
   uniform-scaling handler in `events.ts`). */

import type { MockupTransform, PrintArea } from '../../printArea.js'

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

export type CanvasSize = { width: number; height: number }
export type NaturalSize = { w: number; h: number }

/** Baseline scale that fits the mockup ENTIRELY INSIDE the canvas without
 *  cropping (the "contain" rule, `min(W/nW, H/nH)`). With the canvas now
 *  square, this means a landscape image fills the canvas width and is short
 *  on the vertical axis; a portrait image fills the height and is narrow.
 *  Identity transform = `(x:0, y:0, scale:1)` = mockup's top-left pinned to
 *  the canvas top-left at this baseline. */
export const baselineScaleFor = (canvas: CanvasSize, natural: NaturalSize): number => {
  if (natural.w <= 0 || natural.h <= 0) return 1
  return Math.min(canvas.width / natural.w, canvas.height / natural.h)
}

/** Effective on-canvas scale of the mockup, after the user's `scale` multiplier. */
export const effectiveMockupScale = (baseline: number, mt: MockupTransform): number =>
  baseline * mt.scale

/** Mockup top-left in canvas pixel coords. */
export const mockupOriginOnCanvas = (
  canvas: CanvasSize,
  mt: MockupTransform,
): { left: number; top: number } => ({
  left: canvas.width * mt.x,
  top: canvas.height * mt.y,
})

/** Project an image-local normalized print area to canvas pixel geometry that
 *  can be `.set()` straight onto a Fabric Rect. */
export const areaToRectGeometry = (
  area: PrintArea,
  natural: NaturalSize,
  canvas: CanvasSize,
  mt: MockupTransform,
  baseline: number,
): { left: number; top: number; width: number; height: number; scaleX: number; scaleY: number; angle: number } => {
  const effScale = effectiveMockupScale(baseline, mt)
  const { left: mLeft, top: mTop } = mockupOriginOnCanvas(canvas, mt)
  return {
    left: mLeft + area.x * natural.w * effScale,
    top: mTop + area.y * natural.h * effScale,
    width: area.w * natural.w,
    height: area.h * natural.h,
    scaleX: effScale,
    scaleY: effScale,
    angle: area.rotation,
  }
}

/** Read a Fabric Rect's current canvas-coord geometry back into an image-local
 *  normalized PrintArea (using `meta` for the per-area mm + name we don't read
 *  from the rect itself). The rect's `scaleX` may differ from the mockup's own
 *  scale after a user resize — that's expected; we divide it back out against
 *  the natural-image denominator. */
export const rectToArea = (
  rect: { left: number; top: number; width: number; height: number; scaleX: number; scaleY: number; angle: number; id: string },
  meta: { name: string; widthMm: number; heightMm: number },
  natural: NaturalSize,
  canvas: CanvasSize,
  mt: MockupTransform,
  baseline: number,
): PrintArea => {
  const effScale = effectiveMockupScale(baseline, mt)
  const { left: mLeft, top: mTop } = mockupOriginOnCanvas(canvas, mt)
  // Image-local pixel coords = (canvas - mockup_origin) / effScale.
  const denomScale = effScale || 1
  const localLeftPx = (rect.left - mLeft) / denomScale
  const localTopPx = (rect.top - mTop) / denomScale
  // Render width on screen = rect.width * rect.scaleX. Same in image-local px
  // (divide by effScale): rect.width * rect.scaleX / effScale.
  const localWidthPx = (rect.width * rect.scaleX) / denomScale
  const localHeightPx = (rect.height * rect.scaleY) / denomScale
  const denomW = natural.w || 1
  const denomH = natural.h || 1
  return {
    id: rect.id,
    name: meta.name,
    widthMm: meta.widthMm,
    heightMm: meta.heightMm,
    x: clamp01(localLeftPx / denomW),
    y: clamp01(localTopPx / denomH),
    w: clamp01(localWidthPx / denomW),
    h: clamp01(localHeightPx / denomH),
    rotation: rect.angle,
  }
}

/** Mockup's canvas-coord placement, for `.set()` on the mockup FabricImage. */
export const mockupToFabric = (
  canvas: CanvasSize,
  mt: MockupTransform,
  baseline: number,
): { left: number; top: number; scaleX: number; scaleY: number } => {
  const effScale = effectiveMockupScale(baseline, mt)
  return {
    left: canvas.width * mt.x,
    top: canvas.height * mt.y,
    scaleX: effScale,
    scaleY: effScale,
  }
}

/** Inverse: read a mockup FabricImage's current geometry back into the
 *  normalized `MockupTransform` shape we persist. */
export const mockupFromFabric = (
  fab: { left: number; top: number; scaleX: number },
  canvas: CanvasSize,
  baseline: number,
  locked: boolean,
): MockupTransform => {
  const denomW = canvas.width || 1
  const denomH = canvas.height || 1
  const safeBaseline = baseline || 1
  return {
    x: fab.left / denomW,
    y: fab.top / denomH,
    scale: fab.scaleX / safeBaseline,
    locked,
  }
}

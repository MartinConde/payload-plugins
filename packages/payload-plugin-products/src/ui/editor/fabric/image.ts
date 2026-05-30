/* Mockup-image helpers — loading and placing a `FabricImage` onto the canvas,
   plus the lock-state toggle. Pure-ish: callers own the Canvas + lifecycle. */

import { FabricImage, type Canvas } from 'fabric'
import type { MockupTransform } from '../../printArea.js'
import { mockupToFabric, type CanvasSize, type NaturalSize } from './coords.js'
import { getCachedElement, setCachedElement } from './imageCache.js'

/** Lifecycle-friendly `FabricImage.fromURL`. Resolves with `null` if the load
 *  fails or `disposed()` returns true by the time it finishes — so callers
 *  don't have to litter their async branch with `if (cancelled) return`.
 *
 *  Pass `mediaId` to enable cross-canvas caching of the decoded image element
 *  (see `imageCache.ts`). Without it, every call hits the network + decoder.
 */
export async function loadMockupImage(
  url: string,
  isDisposed: () => boolean,
  mediaId?: string,
): Promise<FabricImage | null> {
  try {
    if (mediaId) {
      const cached = getCachedElement(mediaId)
      if (cached) {
        // Wrap the already-decoded element in a fresh FabricImage — the element
        // is reusable, the FabricImage instance is not (canvas-bound).
        const img = new FabricImage(cached)
        return isDisposed() ? null : img
      }
    }
    const img = await FabricImage.fromURL(url)
    if (isDisposed()) return null
    if (mediaId) {
      const el = img.getElement?.()
      if (el && el instanceof HTMLImageElement) setCachedElement(mediaId, el)
    }
    return img
  } catch (err) {
    if (isDisposed()) return null
    // eslint-disable-next-line no-console
    console.error('[products] mockup image failed to load', url, err)
    return null
  }
}

/** Insert the mockup image as an interactive object at the bottom of the
 *  z-stack so print rects sit above it. Returns the image so the caller can
 *  keep a ref. Idempotent in the sense that the caller controls when this
 *  runs; nothing here mutates anything outside the canvas. */
export function addMockupToCanvas(
  canvas: Canvas,
  img: FabricImage,
  natural: NaturalSize,
  canvasSize: CanvasSize,
  mt: MockupTransform,
  baselineScale: number,
): FabricImage {
  applyMockupTransform(img, canvasSize, mt, baselineScale)
  applyMockupLock(img, mt.locked)
  img.set({
    originX: 'left',
    originY: 'top',
    hoverCursor: mt.locked ? 'default' : 'move',
    hasRotatingPoint: false,
  })
  // Edge handles disabled for uniform scaling (matches the rect convention).
  // The canvas-level `object:scaling` handler enforces `scaleX === scaleY`.
  img.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false, mtr: false })
  canvas.add(img)
  canvas.sendObjectToBack(img)
  // Echo natural dims onto the caller's natural ref convention — the caller
  // owns that ref, but record on the img for completeness.
  img.set({ width: natural.w, height: natural.h })
  return img
}

/** Re-apply the stored mockup transform to the FabricImage. Used after canvas
 *  resize, programmatic transform changes from the Image tab, or a fresh
 *  canvas init. */
export function applyMockupTransform(
  img: FabricImage,
  canvasSize: CanvasSize,
  mt: MockupTransform,
  baselineScale: number,
): void {
  img.set(mockupToFabric(canvasSize, mt, baselineScale))
  img.setCoords()
}

/** Lock / unlock the mockup so it stops responding to drag-select-scale.
 *  Used by the Image tab's "Lock image" toggle. */
export function applyMockupLock(img: FabricImage, locked: boolean): void {
  img.set({
    selectable: !locked,
    evented: !locked,
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: true, // rotation always disabled for the first cut
    hoverCursor: locked ? 'default' : 'move',
  })
}

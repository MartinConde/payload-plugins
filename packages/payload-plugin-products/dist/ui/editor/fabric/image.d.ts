import { FabricImage, type Canvas } from 'fabric';
import type { MockupTransform } from '../../printArea.js';
import { type CanvasSize, type NaturalSize } from './coords.js';
/** Lifecycle-friendly `FabricImage.fromURL`. Resolves with `null` if the load
 *  fails or `disposed()` returns true by the time it finishes — so callers
 *  don't have to litter their async branch with `if (cancelled) return`.
 *
 *  Pass `mediaId` to enable cross-canvas caching of the decoded image element
 *  (see `imageCache.ts`). Without it, every call hits the network + decoder.
 */
export declare function loadMockupImage(url: string, isDisposed: () => boolean, mediaId?: string): Promise<FabricImage | null>;
/** Insert the mockup image as an interactive object at the bottom of the
 *  z-stack so print rects sit above it. Returns the image so the caller can
 *  keep a ref. Idempotent in the sense that the caller controls when this
 *  runs; nothing here mutates anything outside the canvas. */
export declare function addMockupToCanvas(canvas: Canvas, img: FabricImage, natural: NaturalSize, canvasSize: CanvasSize, mt: MockupTransform, baselineScale: number): FabricImage;
/** Re-apply the stored mockup transform to the FabricImage. Used after canvas
 *  resize, programmatic transform changes from the Image tab, or a fresh
 *  canvas init. */
export declare function applyMockupTransform(img: FabricImage, canvasSize: CanvasSize, mt: MockupTransform, baselineScale: number): void;
/** Lock / unlock the mockup so it stops responding to drag-select-scale.
 *  Used by the Image tab's "Lock image" toggle. */
export declare function applyMockupLock(img: FabricImage, locked: boolean): void;

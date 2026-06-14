import type { Canvas, FabricObject } from 'fabric';
import type { CanvasSize } from './coords.js';
/** Enforce uniform scaling during interactive drag-resize: whichever axis the
 *  user is dragging dominates, the other follows. (Fabric v6 dropped the
 *  declarative `lockUniScaling` flag, so this is the real enforcement.)
 *  Returns a disposer that removes the listener. */
export declare function wireUniformScaling(canvas: Canvas): () => void;
/** Constrain an object's translation so it stays inside the canvas bounds.
 *  Two regimes:
 *    - object SMALLER than canvas → must lie fully inside, `0 ≤ left ≤ cW - oW`.
 *    - object LARGER than canvas → cannot be slid past either canvas edge;
 *      `cW - oW ≤ left ≤ 0`, keeping both canvas edges covered (the "rubber
 *      band" rule, so a zoomed-in mockup stays useful).
 *  Mutates the target's `left` / `top` in place; caller decides when to call
 *  `setCoords()` / `requestRenderAll()`. */
export declare function clampObjectToCanvas(target: FabricObject, canvas: CanvasSize): void;

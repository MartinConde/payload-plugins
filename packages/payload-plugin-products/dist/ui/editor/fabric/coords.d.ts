import type { MockupTransform, PrintArea } from '../../printArea.js';
export declare const clamp01: (v: number) => number;
export type CanvasSize = {
    width: number;
    height: number;
};
export type NaturalSize = {
    w: number;
    h: number;
};
/** Baseline scale that fits the mockup ENTIRELY INSIDE the canvas without
 *  cropping (the "contain" rule, `min(W/nW, H/nH)`). With the canvas now
 *  square, this means a landscape image fills the canvas width and is short
 *  on the vertical axis; a portrait image fills the height and is narrow.
 *  Identity transform = `(x:0, y:0, scale:1)` = mockup's top-left pinned to
 *  the canvas top-left at this baseline. */
export declare const baselineScaleFor: (canvas: CanvasSize, natural: NaturalSize) => number;
/** Effective on-canvas scale of the mockup, after the user's `scale` multiplier. */
export declare const effectiveMockupScale: (baseline: number, mt: MockupTransform) => number;
/** Mockup top-left in canvas pixel coords. */
export declare const mockupOriginOnCanvas: (canvas: CanvasSize, mt: MockupTransform) => {
    left: number;
    top: number;
};
/** Project an image-local normalized print area to canvas pixel geometry that
 *  can be `.set()` straight onto a Fabric Rect. */
export declare const areaToRectGeometry: (area: PrintArea, natural: NaturalSize, canvas: CanvasSize, mt: MockupTransform, baseline: number) => {
    left: number;
    top: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    angle: number;
};
/** Read a Fabric Rect's current canvas-coord geometry back into an image-local
 *  normalized PrintArea (using `meta` for the per-area mm + name we don't read
 *  from the rect itself). The rect's `scaleX` may differ from the mockup's own
 *  scale after a user resize — that's expected; we divide it back out against
 *  the natural-image denominator. */
export declare const rectToArea: (rect: {
    left: number;
    top: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    id: string;
}, meta: {
    name: string;
    widthMm: number;
    heightMm: number;
}, natural: NaturalSize, canvas: CanvasSize, mt: MockupTransform, baseline: number) => PrintArea;
/** Mockup's canvas-coord placement, for `.set()` on the mockup FabricImage. */
export declare const mockupToFabric: (canvas: CanvasSize, mt: MockupTransform, baseline: number) => {
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
};
/** Inverse: read a mockup FabricImage's current geometry back into the
 *  normalized `MockupTransform` shape we persist. */
export declare const mockupFromFabric: (fab: {
    left: number;
    top: number;
    scaleX: number;
}, canvas: CanvasSize, baseline: number, locked: boolean) => MockupTransform;

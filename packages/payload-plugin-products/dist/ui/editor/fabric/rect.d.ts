import { Rect } from 'fabric';
import type { MockupTransform, PrintArea } from '../../printArea.js';
import { type CanvasSize, type NaturalSize } from './coords.js';
/** Fabric Rect tagged with its stable `areaId` (the `PrintArea.id`) so we can
 *  cross-reference back to the meta map. */
export type AreaRect = Rect & {
    areaId?: string;
};
export type AreaMeta = {
    name: string;
    widthMm: number;
    heightMm: number;
};
export declare const RECT_STYLE: {
    readonly fill: "rgba(59, 130, 246, 0.15)";
    readonly stroke: "#3b82f6";
    readonly strokeWidth: 1.5;
    readonly strokeUniform: true;
    readonly borderColor: "#3b82f6";
    readonly cornerColor: "#3b82f6";
    readonly cornerStyle: "circle";
    readonly cornerSize: 10;
    readonly transparentCorners: false;
};
/** Build a freshly-styled, aspect-locked Fabric Rect positioned at the given
 *  area's current on-canvas coords (under the current mockup transform). The
 *  rect's `areaId` is set; the uniform-scaling enforcement lives in the
 *  canvas-level `object:scaling` handler (see `events.ts`). */
export declare function makeRect(area: PrintArea, natural: NaturalSize, canvas: CanvasSize, mockupTransform: MockupTransform, baselineScale: number): AreaRect;
/** Re-apply geometry to an existing rect (after the mockup transform or
 *  canvas size changes). Mutates in place and calls `setCoords()` so Fabric's
 *  hit-testing stays consistent with the new visual position. */
export declare function applyAreaToRect(rect: AreaRect, area: PrintArea, natural: NaturalSize, canvas: CanvasSize, mockupTransform: MockupTransform, baselineScale: number): void;
/** Read the rect's current Fabric geometry and meta into a normalized
 *  PrintArea (the persisted shape). */
export declare function readRectArea(rect: AreaRect, meta: AreaMeta, natural: NaturalSize, canvas: CanvasSize, mockupTransform: MockupTransform, baselineScale: number): PrintArea;

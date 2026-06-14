/* Fabric Rect helpers for print-area editor. Encapsulates the visual styling
   and the on-canvas geometry (driven by `coords.ts`) so callers stay terse. */ import { Rect } from 'fabric';
import { areaToRectGeometry, rectToArea } from './coords.js';
export const RECT_STYLE = {
    fill: 'rgba(59, 130, 246, 0.15)',
    stroke: '#3b82f6',
    strokeWidth: 1.5,
    strokeUniform: true,
    borderColor: '#3b82f6',
    cornerColor: '#3b82f6',
    cornerStyle: 'circle',
    cornerSize: 10,
    transparentCorners: false
};
/** Build a freshly-styled, aspect-locked Fabric Rect positioned at the given
 *  area's current on-canvas coords (under the current mockup transform). The
 *  rect's `areaId` is set; the uniform-scaling enforcement lives in the
 *  canvas-level `object:scaling` handler (see `events.ts`). */ export function makeRect(area, natural, canvas, mockupTransform, baselineScale) {
    const geom = areaToRectGeometry(area, natural, canvas, mockupTransform, baselineScale);
    const rect = new Rect({
        ...geom,
        originX: 'left',
        originY: 'top',
        ...RECT_STYLE
    });
    rect.areaId = area.id;
    // Hide edge controls so only corner handles drive scaling — together with the
    // canvas-level `object:scaling` handler this keeps the rect's pixel aspect
    // equal to its physical (mm) aspect. (Fabric v6 dropped the `lockUniScaling`
    // flag, so the event handler is the real enforcement.)
    rect.setControlsVisibility({
        ml: false,
        mr: false,
        mt: false,
        mb: false
    });
    return rect;
}
/** Re-apply geometry to an existing rect (after the mockup transform or
 *  canvas size changes). Mutates in place and calls `setCoords()` so Fabric's
 *  hit-testing stays consistent with the new visual position. */ export function applyAreaToRect(rect, area, natural, canvas, mockupTransform, baselineScale) {
    const geom = areaToRectGeometry(area, natural, canvas, mockupTransform, baselineScale);
    rect.set(geom);
    rect.setCoords();
}
/** Read the rect's current Fabric geometry and meta into a normalized
 *  PrintArea (the persisted shape). */ export function readRectArea(rect, meta, natural, canvas, mockupTransform, baselineScale) {
    return rectToArea({
        id: rect.areaId ?? '',
        left: rect.left ?? 0,
        top: rect.top ?? 0,
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        scaleX: rect.scaleX ?? 1,
        scaleY: rect.scaleY ?? 1,
        angle: rect.angle ?? 0
    }, meta, natural, canvas, mockupTransform, baselineScale);
}

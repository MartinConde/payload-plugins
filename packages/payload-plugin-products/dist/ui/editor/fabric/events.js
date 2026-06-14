/* Canvas-level event wiring helpers. Keeps the canvas-init effect terse and
   centralises the v6 quirks (uniform-scale enforcement, etc.). */ /** Enforce uniform scaling during interactive drag-resize: whichever axis the
 *  user is dragging dominates, the other follows. (Fabric v6 dropped the
 *  declarative `lockUniScaling` flag, so this is the real enforcement.)
 *  Returns a disposer that removes the listener. */ export function wireUniformScaling(canvas) {
    const handler = (e)=>{
        const o = e.target;
        if (!o) return;
        const sc = Math.max(o.scaleX ?? 1, o.scaleY ?? 1);
        o.scaleX = sc;
        o.scaleY = sc;
    };
    canvas.on('object:scaling', handler);
    return ()=>canvas.off('object:scaling', handler);
}
/** Constrain an object's translation so it stays inside the canvas bounds.
 *  Two regimes:
 *    - object SMALLER than canvas → must lie fully inside, `0 ≤ left ≤ cW - oW`.
 *    - object LARGER than canvas → cannot be slid past either canvas edge;
 *      `cW - oW ≤ left ≤ 0`, keeping both canvas edges covered (the "rubber
 *      band" rule, so a zoomed-in mockup stays useful).
 *  Mutates the target's `left` / `top` in place; caller decides when to call
 *  `setCoords()` / `requestRenderAll()`. */ export function clampObjectToCanvas(target, canvas) {
    const cw = canvas.width;
    const ch = canvas.height;
    if (cw <= 0 || ch <= 0) return;
    const ow = (target.width ?? 0) * (target.scaleX ?? 1);
    const oh = (target.height ?? 0) * (target.scaleY ?? 1);
    let left = target.left ?? 0;
    let top = target.top ?? 0;
    if (ow <= cw) {
        left = Math.max(0, Math.min(cw - ow, left));
    } else {
        left = Math.max(cw - ow, Math.min(0, left));
    }
    if (oh <= ch) {
        top = Math.max(0, Math.min(ch - oh, top));
    } else {
        top = Math.max(ch - oh, Math.min(0, top));
    }
    target.set({
        left,
        top
    });
}

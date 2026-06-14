import type { EditorBindings } from '../editor/EditorContext.js';
export type UseEditorBindingsResult = EditorBindings & {
    /** True once the active view has resolvable physical dimensions (a template
     *  has been picked & denormalized, or custom widthMm/heightMm are filled in).
     *  The Designer gates the canvas mount on this so we don't render with a
     *  zero-size print area. */
    hasViewDims: boolean;
    /** Mirror of the active row's `placementLocked` flag. Drives the broadcast
     *  banner and the chip-strip lock toggle. */
    placementLocked: boolean;
    /** Sibling-row count of the active view, excluding rows with
     *  `placementLocked: true`. Drives the "applies to N colors" banner copy. */
    unlockedSiblingCount: number;
};
export declare function useEditorBindings(viewIndex: number, colorIndex: number, mediaSlug: string, disabled?: boolean): UseEditorBindingsResult;

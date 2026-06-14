import * as React from 'react';
import type { FieldInputProps } from '../adminTypes.js';
import { type EditorBindings } from './EditorContext.js';
/** Legacy single-mockup mount: bridges `FieldInputProps` into `EditorBindings`
 *  so the original `.input` override on a top-level `printAreas` JSON field
 *  keeps working. Phase 2's products collection no longer mounts this path —
 *  the Designer is the only surface — but the file stays compilable so
 *  consumers can opt back into the raw editor on any JSON field. */
export declare function PrintAreaEditor(props: FieldInputProps): React.ReactElement;
declare function EditorShell(): React.ReactElement;
/** Public, host-provided variant: renders the editor against an already-built
 *  bindings object. The Designer uses this so it can drive value/onChange off
 *  the active view's split sub-fields (placement + transform) and the
 *  per-view mockup upload. */
export declare function PrintAreaEditorWithBindings({ bindings, }: {
    bindings: EditorBindings;
}): React.ReactElement;
export { EditorShell };

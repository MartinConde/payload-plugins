import * as React from 'react';
import type { RichTextRenderedEntry } from '../richtext/extractRichTextRenderedFields.js';
type Operation = 'create' | 'update';
export type RichTextInputProps = {
    id?: string;
    /** Bridge dotted path (e.g. `body`, `address.editorial`, `items.0.notes`). */
    path: string;
    /** Pre-rendered Field element + initial value from serverProps.formState. */
    rendered: RichTextRenderedEntry;
    /** Current bridge value (SerializedEditorState | null | undefined). */
    value: unknown;
    /** Emit a new SerializedEditorState (or null) to the bridge. */
    onChange: (next: unknown) => void;
    operation: Operation;
    disabled?: boolean;
};
export declare function RichTextInput({ path, rendered, value, onChange, operation, }: RichTextInputProps): React.ReactElement;
export {};

import * as React from 'react';
export type MediaPickerDialogProps = {
    relatedSlug: string;
    /** The collection's useAsTitle field (typically 'filename'). When absent,
     *  the search input is rendered but has no effect on the query. */
    useAsTitle: string | undefined;
    /** true → multi-select with confirm footer; false → click-to-select-and-close. */
    multi: boolean;
    /** Current field value. For multi mode, pass the full selection array so
     *  the dialog can pre-mark already-selected tiles. */
    value: string | string[] | null;
    onChange: (value: string | string[] | null) => void;
    disabled?: boolean;
    /** Optional override for the trigger button label. When omitted the default
     *  is "Choose from library" (single without selection) / "Change…" (single
     *  with an existing selection). Gallery uses "Add from library". */
    triggerLabel?: string;
};
export declare function MediaPickerDialog({ relatedSlug, useAsTitle, multi, value, onChange, disabled, triggerLabel, }: MediaPickerDialogProps): React.ReactElement;

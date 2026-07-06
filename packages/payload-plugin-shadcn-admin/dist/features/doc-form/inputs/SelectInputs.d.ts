import * as React from 'react';
/** Single-selects with more options than this render as a searchable combobox
 *  instead of a plain dropdown. */
export declare const SEARCHABLE_SELECT_THRESHOLD = 8;
/** Searchable single-select combobox (Popover + Command), for long option
 *  lists like a locale picker. Mirrors MultiSelect's chrome but holds one
 *  value and closes on pick. */
export declare function SearchableSelect({ id, options, value, onChange, invalid, disabled, }: {
    id: string;
    options: {
        value: string;
        label: string;
    }[];
    value: string;
    onChange: (next: string) => void;
    invalid?: boolean;
    disabled?: boolean;
}): React.ReactElement;
export declare function MultiSelect({ id, options, value, onChange, invalid, disabled, }: {
    id: string;
    options: {
        value: string;
        label: string;
    }[];
    value: string[];
    onChange: (next: string[]) => void;
    invalid?: boolean;
    disabled?: boolean;
}): React.ReactElement;

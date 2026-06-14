import * as React from 'react';
type Props = {
    relatedSlug: string;
    useAsTitle: string | undefined;
    value: string | null;
    onChange: (value: string | null) => void;
    activeLocale: string | null | undefined;
    disabled?: boolean;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyLabel?: string;
    clearLabel?: string;
};
export declare function DocPicker({ relatedSlug, useAsTitle, value, onChange, activeLocale, disabled, placeholder, searchPlaceholder, emptyLabel, clearLabel, }: Props): React.ReactElement;
export {};

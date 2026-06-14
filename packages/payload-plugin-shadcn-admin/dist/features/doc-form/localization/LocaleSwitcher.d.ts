import * as React from 'react';
/** Serializable Locale shape carried RSC→Client. Mirrors a subset of
 *  Payload's own `Locale` type — only what the dropdown needs. */
export type ExtractedLocale = {
    code: string;
    label: string;
    rtl?: boolean;
};
export type LocaleSwitcherProps = {
    locales: ExtractedLocale[];
    activeLocale: string;
    onChange: (code: string) => void;
    disabled?: boolean;
};
export declare function LocaleSwitcher({ locales, activeLocale, onChange, disabled, }: LocaleSwitcherProps): React.ReactElement | null;

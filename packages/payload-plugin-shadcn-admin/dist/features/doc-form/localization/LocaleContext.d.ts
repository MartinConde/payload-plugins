import * as React from 'react';
type LocaleContextValue = {
    /** Active locale code. `null` when localization is not configured for the
     *  current doc — consumers should treat fields as non-localized in that
     *  case. */
    activeLocale: string | null;
};
export declare const LocaleProvider: React.Provider<LocaleContextValue>;
export declare const useActiveLocale: () => string | null;
export {};

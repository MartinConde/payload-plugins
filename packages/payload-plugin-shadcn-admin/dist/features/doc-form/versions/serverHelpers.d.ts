import type { ExtractedLocale } from '../localization/LocaleSwitcher.js';
/** Normalize `payload.config.localization.locales` to the serializable shape
 *  the client components expect. Returns undefined when localization is off.
 *  Mirrors the inline logic in AutoCollectionDocView. */
export declare const extractLocales: (localizationConfig: unknown) => {
    locales: ExtractedLocale[];
    defaultLocale?: string;
} | undefined;

import * as React from 'react';
import type { ExtractedField } from 'payload-plugin-shadcn-ui';
import type { ExtractedLocale } from '../localization/LocaleSwitcher.js';
type Values = Record<string, unknown> | undefined;
type DiffI18n = unknown;
export type BuildDiffArgs = {
    fields: ExtractedField[];
    valuesFrom: Values;
    valuesTo: Values;
    /** Locale codes to render for localized leaves; empty/undefined when the
     *  project has no localization. */
    selectedLocales: string[];
    /** All configured locales (for label lookup). */
    locales: ExtractedLocale[];
    i18n: DiffI18n;
};
/** Entry point — returns the rendered diff rows (changed fields only). */
export declare function buildDiffFields(args: BuildDiffArgs): React.ReactNode[];
export {};

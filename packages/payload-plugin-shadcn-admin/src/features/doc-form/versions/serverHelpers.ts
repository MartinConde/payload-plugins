/* Shared server-side helpers for the version views. v3.9. */

import { stringifyLabel } from 'payload-plugin-shadcn-ui'
import type { ExtractedLocale } from '../localization/LocaleSwitcher.js'

/** Normalize `payload.config.localization.locales` to the serializable shape
 *  the client components expect. Returns undefined when localization is off.
 *  Mirrors the inline logic in AutoCollectionDocView. */
export const extractLocales = (
  localizationConfig: unknown,
): { locales: ExtractedLocale[]; defaultLocale?: string } | undefined => {
  const cfg = localizationConfig as
    | { locales: unknown[]; defaultLocale?: string }
    | undefined
  if (!cfg || !Array.isArray(cfg.locales)) return undefined
  const locales: ExtractedLocale[] = cfg.locales.map((loc: any) =>
    typeof loc === 'string'
      ? { code: loc, label: loc, rtl: false }
      : {
          code: loc.code,
          label: stringifyLabel(loc.label) ?? loc.code,
          rtl: Boolean(loc.rtl),
        },
  )
  return { locales, defaultLocale: cfg.defaultLocale }
}

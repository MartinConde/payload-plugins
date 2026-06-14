/* Shared server-side helpers for the version views. v3.9. */ import { stringifyLabel } from 'payload-plugin-shadcn-ui';
/** Normalize `payload.config.localization.locales` to the serializable shape
 *  the client components expect. Returns undefined when localization is off.
 *  Mirrors the inline logic in AutoCollectionDocView. */ export const extractLocales = (localizationConfig)=>{
    const cfg = localizationConfig;
    if (!cfg || !Array.isArray(cfg.locales)) return undefined;
    const locales = cfg.locales.map((loc)=>typeof loc === 'string' ? {
            code: loc,
            label: loc,
            rtl: false
        } : {
            code: loc.code,
            label: stringifyLabel(loc.label) ?? loc.code,
            rtl: Boolean(loc.rtl)
        });
    return {
        locales,
        defaultLocale: cfg.defaultLocale
    };
};

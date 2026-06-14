/* Single grep-target for every symbol this plugin pulls from `payload`,
   `payload/shared`, `@payloadcms/ui`, and `@payloadcms/translations`.
   When a Payload bump renames, removes, or reshapes one of these, the typecheck
   fails here once instead of in 60+ call sites. Pair with
   `scripts/check-payload-internals.mjs` which `await import`s this module after
   `pnpm build` and asserts each runtime export resolves to a value — catches
   missing exports at install-time rather than at admin-render time.

   This file has NO `'use client'` directive on purpose: re-exporting client
   hooks from a plain module is safe; the `'use client'` boundary lives on the
   consumer files that actually call the hooks. Verified against Next 16. */ // ---------------------------------------------------------------------------
// from 'payload' (types) — server-side view props + collection/global config
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// from 'payload' (runtime) — server-only operations called inside RSCs
// ---------------------------------------------------------------------------
export { docAccessOperation, getFolderData } from 'payload';
// ---------------------------------------------------------------------------
// from 'payload/shared' (runtime) — client-safe helpers
// ---------------------------------------------------------------------------
export { formatAdminURL, getSafeRedirect, hasDraftsEnabled } from 'payload/shared';
// ---------------------------------------------------------------------------
// from '@payloadcms/ui' (runtime) — client hooks + components used by the
// bridge, list-view client, auth forms, schedule popover, etc.
// ---------------------------------------------------------------------------
export { EditUpload, Form, OperationProvider, toast, useAuth, useConfig, useDocumentDrawerContext, useDocumentInfo, useListDrawerContext, useLocale, useServerFunctions, useTranslation, useUploadHandlers } from '@payloadcms/ui';
export { enTranslations } from '@payloadcms/translations/languages/en'; // translations.ts (English baseline)
export { deepMergeSimple } from '@payloadcms/translations/utilities'; //   plugin.ts (i18n merge under shadcnAdmin namespace)

/* Grep-target for every SERVER-SAFE symbol this plugin pulls from `payload`,
   `payload/shared`, and `@payloadcms/translations`. When a Payload bump
   renames, removes, or reshapes one of these, the typecheck fails here once
   instead of in 60+ call sites. Pair with `scripts/check-payload-internals.mjs`
   which `await import`s this module after `pnpm build` and asserts each
   runtime export resolves to a value — catches missing exports at
   install-time rather than at admin-render time.

   Deliberately excludes `@payloadcms/ui` — those live in the sibling
   `payloadAdapterUI.ts`. This file is on `plugin.ts`'s own import chain (for
   `deepMergeSimple`), which is exactly the module graph a Payload CLI command
   walks when it loads `payload.config.ts`. ES modules fully evaluate a file's
   `export … from` statements regardless of which exports the importer
   actually uses, so keeping `@payloadcms/ui` (whose barrel drags in
   `react-image-crop`'s CSS via `EditUpload`) out of THIS file is what lets
   `payload migrate:*` / `generate:types` / etc. load the config at all — the
   CLI's loader has no CSS handling and crashes otherwise. Don't add an
   `@payloadcms/ui` re-export back here; add it to `payloadAdapterUI.ts`.

   This file has NO `'use client'` directive on purpose: re-exporting client
   hooks from a plain module is safe; the `'use client'` boundary lives on the
   consumer files that actually call the hooks. Verified against Next 16. */

// ---------------------------------------------------------------------------
// from 'payload' (types) — server-side view props + collection/global config
// ---------------------------------------------------------------------------
export type {
  AdminViewServerProps, //                 features/account, auth, dashboard, folder-view
  CollectionConfig, //                     plugin.ts (collection-walk wrappers)
  Config, //                               plugin.ts (root config shape)
  DocumentViewServerProps, //              features/doc-form/{AutoCollectionDocView, api, versions}
  GlobalConfig, //                         plugin.ts (global-walk wrapper)
  ListViewServerProps, //                  features/list-view (server entry + grouping + cells)
  PaginatedDocs, //                        features/list-view (RSC fetch result)
  Payload, //                              dashboard + folder-view (typed payload instance)
  PayloadRequest, //                       dashboard (req.user typing)
  Plugin, //                               plugin.ts (return type)
  SanitizedCollectionConfig, //            features/list-view/grouping (mergeListSearchAndWhere input)
  ServerProps, //                          features/nav/DefaultNav
  TypedUser, //                            features/folder-view/getCollectionFolderData
  UploadEdits, //                          AutoDocFormBridge + CollectionUploadHeader
  Where, //                                features/list-view/{filters, grouping}
} from 'payload'

// ---------------------------------------------------------------------------
// from 'payload' (runtime) — server-only operations called inside RSCs
// ---------------------------------------------------------------------------
export {
  docAccessOperation, //                   features/account/AutoAccountView (RSC permission resolve)
  getFolderData, //                        features/folder-view/AutoBrowseByFolderView (RSC tree fetch)
} from 'payload'

// ---------------------------------------------------------------------------
// from 'payload/shared' (runtime) — client-safe helpers
// ---------------------------------------------------------------------------
export {
  formatAdminURL, //                       auth views + ApiInspector + SchedulePublishPopover
  getSafeRedirect, //                      auth views (?redirect= validation)
  hasDraftsEnabled, //                     ApiInspector (drafts query-param shaping)
  mergeListSearchAndWhere, //              features/list-view (search→where — payload.find has no `search` option)
} from 'payload/shared'

// ---------------------------------------------------------------------------
// from '@payloadcms/translations'
// ---------------------------------------------------------------------------
export type {
  NestedKeysStripped, //                   translations.ts (key-path types for shadcnAdmin namespace)
  TFunction, //                            FieldInput + AutoVersionsView + AutoVersionView + AutoBrowseByFolderView
} from '@payloadcms/translations'

export { enTranslations } from '@payloadcms/translations/languages/en' // translations.ts (English baseline)
export { deepMergeSimple } from '@payloadcms/translations/utilities' //   plugin.ts (i18n merge under shadcnAdmin namespace)

/* Single grep-target for every symbol this plugin pulls from `payload`,
   `payload/shared`, `@payloadcms/ui`, and `@payloadcms/translations`.
   When a Payload bump renames, removes, or reshapes one of these, the typecheck
   fails here once instead of in 60+ call sites. Pair with
   `scripts/check-payload-internals.mjs` which `await import`s this module after
   `pnpm build` and asserts each runtime export resolves to a value — catches
   missing exports at install-time rather than at admin-render time.

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
} from 'payload/shared'

// ---------------------------------------------------------------------------
// from '@payloadcms/ui' (runtime) — client hooks + components used by the
// bridge, list-view client, auth forms, schedule popover, etc.
// ---------------------------------------------------------------------------
export {
  EditUpload, //                           CollectionUploadHeader (image edit dialog)
  Form, //                                 RichTextInput (mounts pre-rendered Lexical field)
  OperationProvider, //                    RichTextInput (mirrors edit/create operation)
  toast, //                                AutoDocFormBridge + auth forms + folder browser + ...
  useAuth, //                              auth forms (LoginForm, CreateFirstUserForm, LogoutClient)
  useConfig, //                            auth forms + ApiInspector + UploadNewDialog + BulkEditSheet + SchedulePublishPopover
  useDocumentDrawerContext, //             AutoDocFormBridge (nested create save callback)
  useDocumentInfo, //                      AutoDocFormBridge + DocViewTabs + ApiInspector
  useListDrawerContext, //                 CollectionListViewClient + GroupedListView (drawer row-select)
  useLocale, //                            ApiInspector + UploadNewDialog + BulkEditSheet + folder + trash bulk
  useServerFunctions, //                   AutoDocFormBridge (getFormState rebuild) + SchedulePublishPopover + useDocFormRichText
  useTranslation, //                       widespread — every client component with strings
  useUploadHandlers, //                    AutoDocFormBridge + UploadNewDialog (client-direct upload)
} from '@payloadcms/ui'

// ---------------------------------------------------------------------------
// from '@payloadcms/translations'
// ---------------------------------------------------------------------------
export type {
  NestedKeysStripped, //                   translations.ts (key-path types for shadcnAdmin namespace)
  TFunction, //                            FieldInput + AutoVersionsView + AutoVersionView + AutoBrowseByFolderView
} from '@payloadcms/translations'

export { enTranslations } from '@payloadcms/translations/languages/en' // translations.ts (English baseline)
export { deepMergeSimple } from '@payloadcms/translations/utilities' //   plugin.ts (i18n merge under shadcnAdmin namespace)

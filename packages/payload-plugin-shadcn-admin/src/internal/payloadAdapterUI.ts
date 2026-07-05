/* Client-only counterpart to `payloadAdapter.ts` — every symbol this plugin
   pulls from `@payloadcms/ui`. Split out deliberately: `payloadAdapter.ts` is
   imported by `plugin.ts` (for `deepMergeSimple`, at plugin-registration
   time) and by `translations.ts`, both of which are on the module graph any
   Payload CLI command (`migrate:create`, `generate:types`, …) walks when it
   loads the project's `payload.config.ts`. ES modules fully evaluate a file's
   own `export … from` statements regardless of which of its exports the
   importer actually uses — so a static `@payloadcms/ui` re-export living in
   *that* file would drag `@payloadcms/ui`'s client barrel (and therefore
   `react-image-crop`'s CSS import, via `EditUpload`) into every CLI
   invocation, which has no CSS loader and crashes before doing anything. See
   REVIEW-FINDINGS.md §2.2 (the CLI-loading crash behind "migrations lag" —
   `deploy:database` runs this exact `payload migrate` path in production).

   Nothing on the CLI's module graph imports from THIS file, so it's fine for
   it to eagerly re-export the full client barrel. Every consumer here is
   itself a `'use client'` component, resolved by Payload's admin bundler via
   its component-path importMap — never by the CLI.

   This file has NO `'use client'` directive on purpose, same reasoning as
   `payloadAdapter.ts`: re-exporting client hooks from a plain module is safe;
   the boundary lives on the consumer files that call the hooks. Verified
   against Next 16. Pair with `scripts/check-payload-internals.mjs`, which
   `await import`s both this module and `payloadAdapter.ts` after `pnpm build`
   and asserts each runtime export resolves to a value. */

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
  useListQuery, //                         FolderListToggle (clears stray `view` key from ListQueryProvider state)
  useLocale, //                            ApiInspector + UploadNewDialog + BulkEditSheet + folder + trash bulk
  useServerFunctions, //                   AutoDocFormBridge (getFormState rebuild) + SchedulePublishPopover + useDocFormRichText
  useTranslation, //                       widespread — every client component with strings
  useUploadHandlers, //                    AutoDocFormBridge + UploadNewDialog (client-direct upload)
} from '@payloadcms/ui'

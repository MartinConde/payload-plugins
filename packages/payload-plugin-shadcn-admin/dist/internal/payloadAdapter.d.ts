export type { AdminViewServerProps, //                 features/account, auth, dashboard, folder-view
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
Where, } from 'payload';
export { docAccessOperation, //                   features/account/AutoAccountView (RSC permission resolve)
getFolderData, } from 'payload';
export { formatAdminURL, //                       auth views + ApiInspector + SchedulePublishPopover
getSafeRedirect, //                      auth views (?redirect= validation)
hasDraftsEnabled, } from 'payload/shared';
export { EditUpload, //                           CollectionUploadHeader (image edit dialog)
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
useUploadHandlers, } from '@payloadcms/ui';
export type { NestedKeysStripped, //                   translations.ts (key-path types for shadcnAdmin namespace)
TFunction, } from '@payloadcms/translations';
export { enTranslations } from '@payloadcms/translations/languages/en';
export { deepMergeSimple } from '@payloadcms/translations/utilities';

export { EditUpload, //                           CollectionUploadHeader (image edit dialog)
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
useUploadHandlers, } from '@payloadcms/ui';

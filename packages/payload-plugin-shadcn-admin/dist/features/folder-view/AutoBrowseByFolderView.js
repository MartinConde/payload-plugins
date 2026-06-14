import { jsx as _jsx } from "react/jsx-runtime";
import { getFolderData } from '../../internal/payloadAdapter.js';
import { ViewShell } from 'payload-plugin-shadcn-ui';
import { FolderBrowserClient } from './FolderBrowserClient.js';
const firstString = (v)=>Array.isArray(v) ? typeof v[0] === 'string' ? v[0] : undefined : typeof v === 'string' ? v : undefined;
/* RSC installed at `admin.components.views.browseByFolder` by the
   `defaultFolderView` plugin option. The router's custom-view lookup resolves
   this before Payload's default `BrowseByFolder` builder runs (same mechanism
   as the `account` override), so it fully replaces the cross-collection folder
   browser. Folder navigation uses a `?folderID=` query param (NOT the
   `/browse-by-folder/:folderID` path, which is hardcoded to Payload's view), so
   our component always renders. Mounted as
   `payload-plugin-shadcn-admin/rsc#AutoBrowseByFolderView`. */ export async function AutoBrowseByFolderView(serverProps) {
    const { initPageResult, searchParams } = serverProps;
    const { req } = initPageResult;
    const { i18n, payload } = req;
    const { config } = payload;
    if (!config.folders) {
        const tt = i18n.t;
        return /*#__PURE__*/ _jsx(ViewShell, {
            breadcrumbs: [
                {
                    label: i18n.t('folder:folders')
                }
            ],
            children: /*#__PURE__*/ _jsx("p", {
                className: "text-muted-foreground",
                children: tt('shadcnAdmin:foldersNotEnabled')
            })
        });
    }
    const adminRoute = config.routes.admin || '/admin';
    const browsePath = config.admin?.routes?.browseByFolder || '/browse-by-folder';
    const basePath = `${adminRoute === '/' ? '' : adminRoute}${browsePath}`;
    const folderID = firstString(searchParams?.folderID) ?? null;
    const rootLabel = i18n.t('folder:browseByFolder');
    const { breadcrumbs, documents, subfolders } = await getFolderData({
        folderID: folderID ?? undefined,
        req,
        sort: 'name'
    });
    return /*#__PURE__*/ _jsx(ViewShell, {
        breadcrumbs: [
            {
                label: rootLabel
            }
        ],
        contentClassName: "p-6",
        children: /*#__PURE__*/ _jsx(FolderBrowserClient, {
            basePath: basePath,
            adminRoute: adminRoute === '/' ? '' : adminRoute,
            foldersSlug: config.folders.slug,
            folderFieldName: config.folders.fieldName,
            currentFolderID: folderID,
            breadcrumbs: breadcrumbs,
            subfolders: subfolders,
            documents: documents,
            rootLabel: rootLabel
        })
    });
}

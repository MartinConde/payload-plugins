/* Per-collection folder data, scoped to one collection. AutoCollectionListView
   runs in a list-view context that has no `req`, so we can't use Payload's
   `getFolderData` (which requires one). This mirrors its output shape
   (`{ breadcrumbs, subfolders, documents }` in FolderItem form) using direct
   `payload.find` with the request user + `overrideAccess: false`. Subfolders
   are the shared folder tree; documents are scoped to `collectionSlug`. */ export async function getCollectionFolderData({ payload, user, locale, collectionSlug, foldersSlug, folderFieldName, folderID, useAsTitle, isUpload }) {
    const folderConstraint = folderID != null ? {
        [folderFieldName]: {
            equals: folderID
        }
    } : {
        [folderFieldName]: {
            exists: false
        }
    };
    const common = {
        depth: 0,
        user,
        overrideAccess: false,
        ...locale ? {
            locale
        } : {},
        limit: 0
    };
    const [folderRes, docRes] = await Promise.all([
        payload.find({
            collection: foldersSlug,
            where: folderConstraint,
            sort: 'name',
            ...common
        }),
        payload.find({
            collection: collectionSlug,
            where: folderConstraint,
            ...common
        })
    ]);
    const subfolders = folderRes.docs.map((doc)=>({
            itemKey: `${foldersSlug}-${doc.id}`,
            relationTo: foldersSlug,
            value: {
                id: doc.id,
                _folderOrDocumentTitle: String(doc.name ?? doc.id)
            }
        }));
    const documents = docRes.docs.map((doc)=>({
            itemKey: `${collectionSlug}-${doc.id}`,
            relationTo: collectionSlug,
            value: {
                id: doc.id,
                _folderOrDocumentTitle: String(useAsTitle && doc[useAsTitle] || doc.filename || doc.id),
                ...isUpload ? {
                    filename: doc.filename,
                    url: doc.thumbnailURL || doc.url
                } : {}
            }
        }));
    const breadcrumbs = await buildBreadcrumbs({
        payload,
        user,
        locale,
        foldersSlug,
        folderFieldName,
        folderID
    });
    return {
        breadcrumbs,
        subfolders,
        documents
    };
}
async function buildBreadcrumbs({ payload, user, locale, foldersSlug, folderFieldName, folderID }) {
    const crumbs = [];
    let id = folderID;
    let guard = 0;
    while(id != null && guard++ < 20){
        let folder;
        try {
            folder = await payload.findByID({
                collection: foldersSlug,
                id,
                depth: 0,
                user,
                overrideAccess: false,
                ...locale ? {
                    locale
                } : {}
            });
        } catch  {
            break;
        }
        if (!folder) break;
        crumbs.unshift({
            id: folder.id,
            name: String(folder.name ?? folder.id)
        });
        const parent = folder[folderFieldName];
        id = parent && typeof parent === 'object' ? parent.id : parent ?? null;
    }
    return crumbs;
}

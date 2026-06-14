import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AutoColumnsBridge } from './AutoColumnsBridge.js';
import { ViewShell } from 'payload-plugin-shadcn-ui';
import { FolderBrowserClient } from '../folder-view/FolderBrowserClient.js';
import { FolderListToggle } from '../folder-view/FolderListToggle.js';
import { getCollectionFolderData } from '../folder-view/getCollectionFolderData.js';
import { DEFAULT_PAGE_SIZE } from './prefs/useDataTableUrlState.js';
import { extractCollection, stringifyLabel } from 'payload-plugin-shadcn-ui';
import { buildListPopulate, buildListSelect, collectionNeedsDepthOne, pickFieldNames } from './columns/fieldPicker.js';
import { renderNativeCells } from './columns/renderNativeCells.js';
import { getGroupableFields } from './columns/groupable.js';
import { GroupByMenu } from './grouping/GroupByMenu.js';
import { GroupedListView } from './grouping/GroupedListView.js';
import { getGroupedData } from './grouping/getGroupedData.js';
import { parseWhere } from './filters/parseWhere.js';
const titleCase = (slug)=>slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
const pluralLabel = (collection)=>stringifyLabel(collection.labels?.plural) ?? titleCase(collection.slug);
const firstString = (v)=>Array.isArray(v) ? v[0] : v;
const toInt = (v, fallback)=>{
    const s = firstString(v);
    if (!s) return fallback;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : fallback;
};
export async function AutoCollectionListView(serverProps) {
    const { collectionSlug, hasCreatePermission, hasDeletePermission, hasTrashPermission, limit, newDocumentURL, payload, searchParams, viewType } = serverProps;
    // `/collections/:slug/trash` flows through this same component: Payload's
    // TrashView calls renderListView({ trash: true, viewType: 'trash' }), which
    // renders our `views.list.Component`. We branch on viewType to filter to
    // soft-deleted docs and swap in restore / permanent-delete actions.
    const isTrash = viewType === 'trash';
    const t = serverProps.i18n?.t;
    const collection = payload?.config?.collections?.find((c)=>c.slug === collectionSlug);
    if (!collection) {
        return /*#__PURE__*/ _jsx(ViewShell, {
            breadcrumbs: [
                {
                    label: collectionSlug ?? 'Unknown'
                }
            ],
            children: /*#__PURE__*/ _jsxs("p", {
                className: "text-muted-foreground",
                children: [
                    'Collection "',
                    collectionSlug,
                    '" not found in Payload config.'
                ]
            })
        });
    }
    const foldersEnabled = Boolean(collection.folders) && Boolean(payload.config.folders);
    const listBasePath = `/admin/collections/${collectionSlug}`;
    // Folder mode: `/collections/:slug?view=folders`. We branch on our own query
    // param (NOT Payload's `listViewType` preference, which would route to
    // Payload's hardcoded folder view) and render the shadcn folder browser
    // scoped to this collection.
    const sp = searchParams;
    if (!isTrash && foldersEnabled && firstString(sp?.view) === 'folders') {
        const foldersConfig = payload.config.folders;
        const folderID = firstString(sp?.folderID) ?? null;
        const collTitle = pluralLabel(collection);
        const { breadcrumbs, subfolders, documents } = await getCollectionFolderData({
            payload,
            user: serverProps.user,
            locale: serverProps.locale?.code,
            collectionSlug,
            foldersSlug: foldersConfig.slug,
            folderFieldName: foldersConfig.fieldName,
            folderID,
            useAsTitle: collection.admin?.useAsTitle,
            isUpload: Boolean(collection.upload)
        });
        return /*#__PURE__*/ _jsx(ViewShell, {
            breadcrumbs: [
                {
                    label: collTitle
                }
            ],
            headerActions: /*#__PURE__*/ _jsx(FolderListToggle, {
                basePath: listBasePath,
                mode: "folders"
            }),
            children: /*#__PURE__*/ _jsx(FolderBrowserClient, {
                basePath: listBasePath,
                adminRoute: "/admin",
                foldersSlug: foldersConfig.slug,
                folderFieldName: foldersConfig.fieldName,
                currentFolderID: folderID,
                breadcrumbs: breadcrumbs,
                subfolders: subfolders,
                documents: documents,
                extraQuery: {
                    view: 'folders'
                },
                rootLabel: collTitle
            })
        });
    }
    const serializableCollection = extractCollection(collection, serverProps.i18n);
    const useAsTitleBySlug = {};
    for (const c of payload.config.collections ?? []){
        useAsTitleBySlug[c.slug] = c.admin?.useAsTitle;
    }
    // v3.22 — grouped mode (`?groupBy=<field>`, `-field` for descending group
    // order). One capped find, grouped in JS (see getGroupedData — findDistinct
    // isn't available on every adapter). Not in trash mode (trash stays flat).
    const groupableFields = getGroupableFields(serializableCollection);
    const spAll = searchParams;
    const groupByRaw = !isTrash ? firstString(spAll?.groupBy) : undefined;
    const groupByName = groupByRaw ? groupByRaw.replace(/^-/, '') : undefined;
    const groupByField = groupByName ? groupableFields.find((f)=>f.name === groupByName) : undefined;
    // "Group by" picker (both flat + grouped headers). The active grouping is
    // passed as a server-parsed prop so the trigger label never lags the URL.
    const groupByMenu = groupableFields.length > 0 ? /*#__PURE__*/ _jsx(GroupByMenu, {
        fields: groupableFields,
        current: groupByName ?? null
    }) : null;
    if (groupByName && groupByField) {
        const where = parseWhere(spAll) ?? undefined;
        const search = firstString(spAll?.search);
        const rawField = collection.fields.find((f)=>f.name === groupByName);
        const { groups, totalGroups, capped } = await getGroupedData({
            payload,
            collectionSlug: collectionSlug,
            groupByName,
            groupByField: rawField ?? {
                type: groupByField.type,
                name: groupByName
            },
            sortDesc: groupByRaw.startsWith('-'),
            where,
            search,
            trash: false,
            locale: serverProps.locale?.code,
            user: serverProps.user,
            useAsTitleBySlug,
            noValueLabel: t?.('general:noValue') ?? 'No value'
        });
        // Pre-render native cells across every group's rows (rowIds are unique).
        const groupedDocs = groups.flatMap((g)=>g.rows);
        const { fieldNames: nativeCellFieldNames, byRow: nativeCellsByRow } = renderNativeCells({
            collection: collection,
            extractedFields: serializableCollection.fields ?? [],
            columnNames: pickFieldNames(serializableCollection),
            docs: groupedDocs,
            payload,
            i18n: serverProps.i18n,
            collectionSlug: collectionSlug,
            viewType
        });
        const title = pluralLabel(collection);
        return /*#__PURE__*/ _jsx(ViewShell, {
            breadcrumbs: [
                {
                    label: title
                }
            ],
            headerActions: /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                    foldersEnabled ? /*#__PURE__*/ _jsx(FolderListToggle, {
                        basePath: listBasePath,
                        mode: "list"
                    }) : null,
                    groupByMenu
                ]
            }),
            children: /*#__PURE__*/ _jsx(GroupedListView, {
                collectionSlug: collectionSlug,
                collection: serializableCollection,
                useAsTitleBySlug: useAsTitleBySlug,
                nativeCellFieldNames: nativeCellFieldNames,
                nativeCellsByRow: nativeCellsByRow,
                groups: groups,
                groupByLabel: groupByField.label,
                totalGroups: totalGroups,
                capped: capped
            })
        });
    }
    let paginated = serverProps.data;
    if (collectionNeedsDepthOne(serializableCollection)) {
        const sp = searchParams;
        const page = toInt(sp?.page, 1);
        const limitParam = toInt(sp?.limit, limit ?? DEFAULT_PAGE_SIZE);
        const sort = firstString(sp?.sort);
        const search = firstString(sp?.search);
        const parsedWhere = parseWhere(sp);
        // In trash mode this refetch must mirror renderListView's trash handling:
        // pass `trash: true` AND constrain to docs with a `deletedAt` set. Without
        // this, a collection with relationships (depth:1 path) would show live docs
        // on the trash route.
        const where = isTrash ? {
            and: [
                ...parsedWhere ? [
                    parsedWhere
                ] : [],
                {
                    deletedAt: {
                        exists: true
                    }
                }
            ]
        } : parsedWhere;
        const select = buildListSelect(serializableCollection);
        const populate = buildListPopulate(serializableCollection, useAsTitleBySlug);
        try {
            paginated = await payload.find({
                collection: collectionSlug,
                depth: 1,
                page,
                limit: limitParam,
                ...sort ? {
                    sort
                } : {},
                ...where ? {
                    where
                } : {},
                ...search ? {
                    search
                } : {},
                ...isTrash ? {
                    trash: true
                } : {},
                ...serverProps.locale?.code ? {
                    locale: serverProps.locale.code
                } : {},
                select,
                ...populate ? {
                    populate
                } : {},
                user: serverProps.user,
                overrideAccess: false
            });
        } catch (err) {
            payload.logger?.error?.({
                msg: 'AutoCollectionListView: depth:1 refetch failed, falling back to serverProps.data',
                err
            });
        }
    }
    const docs = paginated?.docs ?? [];
    // v3.20 — pre-render any Payload-native `field.admin.components.Cell` for the
    // visible columns, server-side, via Payload's own RenderServerComponent. The
    // resulting per-row nodes are threaded to the client column builder, which
    // looks them up instead of using the built-in renderer. Plugin `.cell`
    // overrides still win (resolved client-side in buildColumnsForCollection).
    const { fieldNames: nativeCellFieldNames, byRow: nativeCellsByRow } = renderNativeCells({
        collection: collection,
        extractedFields: serializableCollection.fields ?? [],
        columnNames: pickFieldNames(serializableCollection),
        docs: docs,
        payload,
        i18n: serverProps.i18n,
        collectionSlug: collectionSlug,
        viewType
    });
    const useAsTitle = collection.admin?.useAsTitle;
    const listSearchableFields = collection.admin?.listSearchableFields;
    const searchEnabled = Boolean(useAsTitle || Array.isArray(listSearchableFields) && listSearchableFields.length > 0);
    const title = pluralLabel(collection);
    const trashLabel = t?.('general:trash') ?? 'Trash';
    const breadcrumbs = isTrash ? [
        {
            label: title,
            href: `/admin/collections/${collectionSlug}`
        },
        {
            label: trashLabel
        }
    ] : [
        {
            label: title
        }
    ];
    const emptyMessage = isTrash ? t?.('general:noTrashResults', {
        label: title
    }) ?? `No ${title} in trash.` : undefined;
    // Folder toggle + group-by picker (group-by hidden in trash mode, where
    // `groupByMenu` would still render — gate it on !isTrash here).
    const folderToggle = foldersEnabled && !isTrash ? /*#__PURE__*/ _jsx(FolderListToggle, {
        basePath: listBasePath,
        mode: "list"
    }) : null;
    const listGroupByMenu = !isTrash ? groupByMenu : null;
    const listHeaderActions = folderToggle || listGroupByMenu ? /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-2",
        children: [
            folderToggle,
            listGroupByMenu
        ]
    }) : undefined;
    return /*#__PURE__*/ _jsx(ViewShell, {
        breadcrumbs: breadcrumbs,
        headerActions: listHeaderActions,
        children: /*#__PURE__*/ _jsx(AutoColumnsBridge, {
            collection: serializableCollection,
            useAsTitleBySlug: useAsTitleBySlug,
            nativeCellFieldNames: nativeCellFieldNames,
            nativeCellsByRow: nativeCellsByRow,
            collectionSlug: collectionSlug,
            data: docs,
            pageCount: paginated?.totalPages ?? 1,
            rowCount: paginated?.totalDocs ?? 0,
            defaultPageSize: limit ?? DEFAULT_PAGE_SIZE,
            newDocumentURL: newDocumentURL ?? '',
            enableSearch: searchEnabled,
            enableBulkDelete: Boolean(hasDeletePermission),
            enableCreate: isTrash ? false : Boolean(hasCreatePermission),
            isTrash: isTrash,
            trashEnabled: Boolean(collection.trash),
            hasTrashPermission: Boolean(hasTrashPermission),
            emptyMessage: emptyMessage
        })
    });
}

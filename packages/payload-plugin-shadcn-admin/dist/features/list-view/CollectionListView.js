import { jsx as _jsx } from "react/jsx-runtime";
import { CollectionListViewClient } from './CollectionListViewClient.js';
import { ViewShell } from 'payload-plugin-shadcn-ui';
import { DEFAULT_PAGE_SIZE } from './prefs/useDataTableUrlState.js';
export function CollectionListView({ serverProps, title, columns, mapRow, breadcrumbs, paginatedDocs, enableSearch, searchPlaceholder, enableBulkDelete, enableCreate, enableSorting, enableFiltering, enableColumnVisibility, filterColumnId, filterPlaceholder, toolbarRight, filterBar, bulkActions, onRowClick, disableRowClick }) {
    const { collectionSlug, hasCreatePermission, hasDeletePermission, limit, newDocumentURL, payload } = serverProps;
    const paginated = paginatedDocs ?? serverProps.data;
    const docs = paginated?.docs ?? [];
    const data = mapRow ? docs.map(mapRow) : docs;
    const collection = payload?.config?.collections?.find((c)=>c.slug === collectionSlug);
    const useAsTitle = collection?.admin?.useAsTitle;
    const listSearchableFields = collection?.admin?.listSearchableFields;
    const searchEnabledDefault = Boolean(useAsTitle || Array.isArray(listSearchableFields) && listSearchableFields.length > 0);
    const resolvedSearch = enableSearch ?? searchEnabledDefault;
    const resolvedBulkDelete = enableBulkDelete ?? Boolean(hasDeletePermission);
    const resolvedCreate = enableCreate ?? Boolean(hasCreatePermission);
    return /*#__PURE__*/ _jsx(ViewShell, {
        breadcrumbs: breadcrumbs ?? [
            {
                label: title
            }
        ],
        children: /*#__PURE__*/ _jsx(CollectionListViewClient, {
            collectionSlug: collectionSlug,
            columns: columns,
            data: data,
            pageCount: paginated?.totalPages ?? 1,
            rowCount: paginated?.totalDocs ?? 0,
            defaultPageSize: limit ?? DEFAULT_PAGE_SIZE,
            newDocumentURL: newDocumentURL ?? '',
            enableSearch: resolvedSearch,
            searchPlaceholder: searchPlaceholder,
            enableBulkDelete: resolvedBulkDelete,
            enableCreate: resolvedCreate,
            enableSorting: enableSorting,
            enableFiltering: enableFiltering,
            enableColumnVisibility: enableColumnVisibility,
            filterColumnId: filterColumnId,
            filterPlaceholder: filterPlaceholder,
            toolbarRight: toolbarRight,
            filterBar: filterBar,
            bulkActions: bulkActions,
            onRowClick: onRowClick,
            disableRowClick: disableRowClick
        })
    });
}

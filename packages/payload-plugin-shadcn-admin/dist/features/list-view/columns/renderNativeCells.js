/* v3.20 — native `field.admin.components.Cell` interop.

   Payload-native Cell components are referenced in the collection config as a
   `PayloadComponent` (a path string / `{path, exportName}`) under
   `field.admin.components.Cell`, and resolved through the import map at render
   time. Our `.cell` escape hatch (§7b) is plugin-namespaced and lives in
   `field.custom` instead — it never touches the import map. This helper closes
   the native gap by pre-rendering each native Cell SERVER-SIDE via Payload's own
   `RenderServerComponent` (the same call site as `@payloadcms/ui`'s
   `renderCell`), so both client AND server Cells resolve, and Payload hands the
   component the canonical `DefaultCell{,Server}ComponentProps`.

   The rendered ReactNodes are returned as `{ [rowId]: { [fieldName]: node } }`
   and threaded to the client column builder, where the TanStack cell does a
   single `[rowId]?.[fieldName]` lookup instead of calling the built-in renderer.

   LIMITATION (documented in SETUP §7b): a native Cell that calls Payload's
   list-view client hooks (`useTableCell` / `useListQuery` / `useListInfo`) will
   throw at hydration — those hooks need providers we don't mount. Such Cells
   should use the `.cell` escape hatch instead. We deliberately do NOT recreate
   Payload's `ListProvider` tree (separate, much larger lift). */ import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent';
export function renderNativeCells({ collection, extractedFields, columnNames, docs, payload, i18n, collectionSlug, viewType }) {
    const rawByName = new Map();
    for (const f of collection.fields ?? []){
        if (f?.name) rawByName.set(f.name, f);
    }
    const extractedByName = new Map();
    for (const f of extractedFields){
        if (f?.name) extractedByName.set(f.name, f);
    }
    // Resolve the column fields that actually carry a native Cell reference.
    const nativeFields = [];
    for (const name of columnNames){
        const raw = rawByName.get(name);
        if (raw?.admin?.components?.Cell) nativeFields.push({
            name,
            raw
        });
    }
    if (nativeFields.length === 0) return {
        fieldNames: [],
        byRow: {}
    };
    const byRow = {};
    for(let rowIndex = 0; rowIndex < docs.length; rowIndex++){
        const doc = docs[rowIndex];
        const rowKey = String(doc.id);
        const rowCells = {};
        for(let columnIndex = 0; columnIndex < nativeFields.length; columnIndex++){
            const { name, raw } = nativeFields[columnIndex];
            const cellData = doc[name];
            // Mirror @payloadcms/ui's `renderCell` prop split: clientProps go to
            // client Cells (must serialize — `field` is our client-safe extracted
            // shape, `rowData` is JSON doc data), serverProps go to server Cells
            // (server-only; the raw field + payload + i18n are fine here). We do not
            // link cells or wire onClick — the row itself is the link in our table.
            const clientField = extractedByName.get(name) ?? {
                name,
                type: raw.type
            };
            const clientProps = {
                cellData,
                collectionSlug,
                field: clientField,
                link: false,
                rowData: doc,
                viewType
            };
            const serverProps = {
                cellData,
                collectionConfig: payload.collections?.[collectionSlug]?.config,
                collectionSlug,
                columnIndex,
                field: raw,
                i18n,
                link: false,
                payload,
                rowData: doc
            };
            rowCells[name] = RenderServerComponent({
                clientProps,
                Component: raw.admin.components.Cell,
                importMap: payload.importMap,
                serverProps,
                key: `${rowKey}-${name}`
            });
        }
        byRow[rowKey] = rowCells;
    }
    return {
        fieldNames: nativeFields.map((f)=>f.name),
        byRow
    };
}

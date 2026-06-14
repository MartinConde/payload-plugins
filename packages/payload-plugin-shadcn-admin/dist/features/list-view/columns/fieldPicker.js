/* Server-callable helpers that inspect a collection's field config. Kept
   separate from autoColumns.tsx (a 'use client' module) so the RSC wrapper
   can call them directly. No React, no JSX, no side effects. */ const STRUCTURAL_TYPES = new Set([
    'group',
    'tabs',
    'row',
    'collapsible',
    'ui'
]);
const SYNTHETIC_FIELD_NAMES = new Set([
    'id',
    'createdAt',
    'updatedAt'
]);
const isExcluded = (field)=>Boolean(field.hidden || field.admin?.hidden || field.admin?.disableListColumn);
/* Pick which field names should appear as columns, in display order. */ export function pickFieldNames(collection) {
    const defaults = collection.admin?.defaultColumns;
    if (defaults && defaults.length > 0) return [
        ...defaults
    ];
    const useAsTitle = collection.admin?.useAsTitle;
    const names = [];
    if (useAsTitle) names.push(useAsTitle);
    for (const field of collection.fields){
        if (!field.name) continue;
        if (STRUCTURAL_TYPES.has(field.type)) continue;
        if (isExcluded(field)) continue;
        if (names.includes(field.name)) continue;
        names.push(field.name);
        if (names.length >= 4) break;
    }
    if (!names.includes('createdAt')) names.push('createdAt');
    if (!names.includes('updatedAt')) names.push('updatedAt');
    return names;
}
/* Project only the picked columns for the list-view refetch. `pickFieldNames`
   already appends createdAt/updatedAt and includes relationship/upload column
   names; Payload always returns `id` regardless of `select`. So this stays in
   sync with the rendered columns by construction — do not hardcode. */ export function buildListSelect(collection) {
    const select = {};
    for (const name of pickFieldNames(collection))select[name] = true;
    return select;
}
/* Trim populated relationship/upload docs to just their useAsTitle (keyed by
   related collection slug — Payload's `populate` is slug-keyed, not field-keyed).
   `select` can't reach into populated docs, so this is what actually shrinks the
   related-doc payload. Skips slugs with no useAsTitle: the cell falls back to the
   always-returned `id`, and `populate[slug] = { [undefined]: true }` would be a
   footgun. Returns undefined when there's nothing to populate. */ export function buildListPopulate(collection, useAsTitleBySlug) {
    const populate = {};
    for (const name of pickFieldNames(collection)){
        if (SYNTHETIC_FIELD_NAMES.has(name)) continue;
        const field = collection.fields.find((f)=>f.name === name);
        if (!field) continue;
        if (field.type !== 'relationship' && field.type !== 'upload') continue;
        const slugs = Array.isArray(field.relationTo) ? field.relationTo : field.relationTo ? [
            field.relationTo
        ] : [];
        for (const slug of slugs){
            const useAsTitle = useAsTitleBySlug[slug];
            if (!useAsTitle) continue;
            populate[slug] = {
                [useAsTitle]: true
            };
        }
    }
    return Object.keys(populate).length > 0 ? populate : undefined;
}
/* True when any picked column is a non-polymorphic relationship/upload —
   meaning the auto view should re-fetch with depth: 1 so cells can render
   useAsTitle of the related document. */ export function collectionNeedsDepthOne(collection) {
    const names = pickFieldNames(collection);
    for (const name of names){
        if (SYNTHETIC_FIELD_NAMES.has(name)) continue;
        const field = collection.fields.find((f)=>f.name === name);
        if (!field) continue;
        if (field.type === 'relationship' || field.type === 'upload') {
            if (!Array.isArray(field.relationTo)) return true;
        }
    }
    return false;
}

/* v3.22 — which fields a list view can be grouped by. Mirrors the set Payload's
   own group-by accepts: scalar-ish fields plus relationship (headings resolve
   the related doc's useAsTitle). Excludes structural / rich / multi-value types
   where an equality group makes no sense. `hasMany` is excluded because a doc
   can belong to several groups at once — Payload's group-by is single-valued. */ export const GROUPABLE_TYPES = new Set([
    'text',
    'email',
    'number',
    'date',
    'checkbox',
    'radio',
    'select',
    'relationship'
]);
const titleCase = (name)=>name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
const labelOf = (field)=>{
    const l = field.label;
    if (typeof l === 'string' && l.length > 0) return l;
    return titleCase(field.name ?? '');
};
/** Top-level fields offered in the "Group by" picker. */ export function getGroupableFields(collection) {
    const out = [];
    for (const field of collection.fields){
        if (!field.name) continue;
        if (field.hasMany) continue;
        if (field.admin?.hidden || field.admin?.disableListColumn) continue;
        if (!GROUPABLE_TYPES.has(field.type)) continue;
        out.push({
            name: field.name,
            label: labelOf(field),
            type: field.type
        });
    }
    return out;
}

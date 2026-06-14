function stringifyLabel(value) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
        // Payload localizes labels as { [locale]: string }. Pick the first string value.
        for (const v of Object.values(value)){
            if (typeof v === 'string') return v;
        }
    }
    return null;
}
function titleCase(slug) {
    return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
}
/* Map a Payload config's collections to the shape CollectionsSidebarGroup
   expects. Hidden collections (admin.hidden === true) are skipped. The
   function-form of admin.hidden is treated as visible — call sites that want
   per-user filtering should pass already-filtered collections. */ export function collectionsFromPayloadConfig(config) {
    const collections = config.collections ?? [];
    return collections.filter((c)=>c.admin?.hidden !== true).map((c)=>({
            slug: c.slug,
            label: stringifyLabel(c.labels?.plural) ?? titleCase(c.slug)
        }));
}
/* Companion of collectionsFromPayloadConfig for globals. Hidden globals
   (admin.hidden === true) are skipped. */ export function globalsFromPayloadConfig(config) {
    const globals = config.globals ?? [];
    return globals.filter((g)=>g.admin?.hidden !== true).map((g)=>({
            slug: g.slug,
            label: stringifyLabel(g.label) ?? titleCase(g.slug)
        }));
}

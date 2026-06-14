/* Pure, Node-safe meta-template resolver. Shared by the frontend (or the
   optional virtual field) so token resolution is identical everywhere. No
   Payload imports.

   Templates use `{{token}}` placeholders, e.g.
     "{{title}} {{separator}} {{sitename}}"
   Unknown / empty tokens resolve to '' and surrounding whitespace is collapsed,
   so a missing token never leaves a dangling separator or double space. */ /** Documented built-in tokens. Consumers may pass any extra keys in `vars`. */ export const SEO_TEMPLATE_TOKENS = [
    'title',
    'sitename',
    'excerpt',
    'separator',
    'category'
];
/**
 * Resolve a `{{token}}` template against `vars`. Returns '' for an empty
 * template. Whitespace runs are collapsed and the result is trimmed so missing
 * tokens don't leave stray separators.
 */ export function resolveTemplate(template, vars = {}) {
    if (!template) return '';
    return template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_match, key)=>{
        const value = vars[key];
        return value == null ? '' : String(value);
    }).replace(/\s+/g, ' ').trim();
}

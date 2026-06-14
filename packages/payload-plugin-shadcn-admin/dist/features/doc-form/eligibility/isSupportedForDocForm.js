/* Field-type support matrix for the auto doc form.
   Used at plugin-eval time to pre-flight collections (skip auto-install if any
   required field is outside the matrix) and at render time to filter the form.
   v2 widened the matrix to include: point, code, json, array, blocks, group,
   tabs, and polymorphic relationships. v3 adds richText (Lexical) — the field
   is rendered via Payload's pre-built customComponents.Field element lifted
   from serverProps.formState and mounted inside a small Form shim in the
   bridge. v3.5 adds collection-level `upload` (custom shadcn dropzone +
   multipart submit) and field-level `type: 'upload'` (relationship to an
   upload doc with thumbnail picker). v3.6 lifts the polymorphic-upload
   limitation (`relationTo: string[]` now flows through UploadFieldInput's
   slug switcher; the matrix entry is unchanged — `upload` is supported
   regardless of single-vs-poly `relationTo`). */ export const SUPPORTED_DOC_FORM_TYPES = new Set([
    'text',
    'textarea',
    'email',
    'number',
    'date',
    'checkbox',
    'select',
    'radio',
    'relationship',
    'upload',
    'point',
    'code',
    'json',
    'array',
    'blocks',
    'richText'
]);
/* Structural containers that the bridge walks transparently (their direct
   children are what the matrix actually checks). */ const STRUCTURAL_PASSTHROUGH = new Set([
    'row',
    'collapsible',
    'group'
]);
export const isFieldSupportedForDocForm = (field)=>{
    // Containers that the renderer walks into directly.
    if (STRUCTURAL_PASSTHROUGH.has(field.type)) return true;
    if (field.type === 'tabs') return true;
    return SUPPORTED_DOC_FORM_TYPES.has(field.type);
};
/* Walk a Payload collection (raw or extracted) and return any required fields
   whose type the doc form can't render.
   row/collapsible/group/tabs/array/blocks structural fields are transparent —
   their children are walked.
   v3.5: collection-level `upload` is NO LONGER a blocker — the bridge now
   renders a custom dropzone above the field list and submits multipart on
   create / when a new file is picked. */ export const findBlockingRequiredFields = (collection)=>{
    const blockers = [];
    const visit = (fields, prefix)=>{
        if (!Array.isArray(fields)) return;
        for (const f of fields){
            const t = f?.type;
            const childPrefix = f?.name ? `${prefix}${f.name}.` : prefix;
            // Transparent containers: recurse, no name needed.
            if (t === 'row' || t === 'collapsible') {
                visit(f.fields, prefix);
                continue;
            }
            if (t === 'group') {
                // Even when required (Payload group has no required flag at the
                // container level), walk into subfields.
                visit(f.fields, childPrefix);
                continue;
            }
            if (t === 'tabs') {
                for (const tab of f.tabs ?? []){
                    const tabPrefix = tab && typeof tab.name === 'string' ? `${prefix}${tab.name}.` : prefix;
                    visit(tab.fields, tabPrefix);
                }
                continue;
            }
            if (t === 'array') {
                // Required array → walk subfields with the array prefix so a
                // blocking subfield reports a useful path. Array itself only blocks
                // if its element-level support fails (subfields).
                visit(f.fields, `${childPrefix}[].`);
                continue;
            }
            if (t === 'blocks') {
                for (const block of f.blocks ?? []){
                    visit(block.fields, `${childPrefix}{${block.slug}}.`);
                }
                continue;
            }
            if (!f?.required) continue;
            if (SUPPORTED_DOC_FORM_TYPES.has(t)) continue;
            blockers.push({
                name: `${prefix}${f.name ?? '(unnamed)'}`,
                type: t
            });
        }
    };
    visit(collection.fields, '');
    return blockers;
};

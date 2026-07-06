/* Pure helpers for UploadNewDialog's per-row bookkeeping: form-state-fetch
   detection, top-level required-leaf collection, and row id minting. No
   React — kept separate so the dialog file stays focused on orchestration. */ import { isFieldRenderable } from '../fieldTree/sharedHelpers.js';
/* Field types whose presence means a getFormState round-trip is needed to
   render their (possibly richText-bearing) inner content. Mirrors bulk-edit. */ export const FORM_STATE_TYPES = new Set([
    'richText',
    'array',
    'blocks'
]);
export const schemaHasFormStateFields = (fields)=>{
    for (const f of fields){
        if (FORM_STATE_TYPES.has(f.type)) return true;
        if (f.fields && schemaHasFormStateFields(f.fields)) return true;
        if (f.tabs && f.tabs.some((t)=>schemaHasFormStateFields(t.fields))) return true;
        if (f.blocks && f.blocks.some((b)=>schemaHasFormStateFields(b.fields))) return true;
    }
    return false;
};
/* Top-level required scalar leaves (flattening only the transparent row /
   collapsible wrappers). Required fields nested inside named group/tabs or
   complex containers are validated by the server (their dotted-path errors map
   back into the renderer). */ export const topLevelRequiredLeafNames = (fields)=>{
    const out = [];
    const walk = (list)=>{
        for (const f of list){
            if (f.type === 'row' || f.type === 'collapsible') {
                if (f.fields) walk(f.fields);
                continue;
            }
            if (f.name && f.required && isFieldRenderable(f) && !FORM_STATE_TYPES.has(f.type) && f.type !== 'group' && f.type !== 'tabs') {
                out.push(f.name);
            }
        }
    };
    walk(fields);
    return out;
};
export const isEmptyValue = (v)=>v === undefined || v === null || v === '' || Array.isArray(v) && v.length === 0;
let rowCounter = 0;
export const nextRowId = ()=>{
    rowCounter += 1;
    return `row-${rowCounter}-${Date.now()}`;
};

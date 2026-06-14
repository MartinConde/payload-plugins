/* Pure helpers shared by the doc-form bridge (AutoDocFormBridge) and the
   list-view bulk-edit drawer. Extracted verbatim from AutoDocFormBridge so the
   bridge's field-tree recursion (now in FieldTreeRenderer) can be reused
   standalone. No behavior change — these are the same functions the bridge
   has always used; they just live in one place now. */ import { isFieldSupportedForDocForm } from '../eligibility/isSupportedForDocForm.js';
export const PLUGIN_NAMESPACE = 'plugin-shadcn-admin';
// Matches the doc-form bridge's set exactly: includes `_status` (drafts state
// is owned explicitly, never echoed in a PATCH body) and omits `password` (the
// synthesized `__password` create-mode field is added separately).
export const SYSTEM_FIELD_NAMES = new Set([
    'id',
    'createdAt',
    'updatedAt',
    '_status',
    'salt',
    'hash',
    'sessions',
    'loginAttempts',
    'lockUntil',
    'resetPasswordToken',
    'resetPasswordExpiration',
    'enableAPIKey',
    'apiKey',
    'apiKeyIndex',
    '_verified',
    '_verificationToken'
]);
export const labelOf = (field)=>field.label && field.label.length > 0 ? field.label : field.name ?? '';
export const isFieldRenderable = (field)=>{
    if (!field.name) return false;
    if (SYSTEM_FIELD_NAMES.has(field.name)) return false;
    if (field.admin?.hidden) return false;
    if (field.admin?.disabled) return false;
    if (field.hidden === true) return false;
    const hideInDocForm = field.custom?.[PLUGIN_NAMESPACE]?.hideInDocForm;
    if (hideInDocForm) return false;
    if (!isFieldSupportedForDocForm(field)) return false;
    return true;
};
export const TRANSPARENT_STRUCTURAL = new Set([
    'row',
    'collapsible',
    'group',
    'tabs'
]);
/* A `ui` field carrying our `.input` override is a presentational vessel for a
   custom component — renderable even though `ui` is outside the data field
   matrix and absent from `docPermissions`. FieldTreeRenderer's renderChild
   renders it bare via FieldInput. */ export const isUiOverride = (field)=>field.type === 'ui' && Boolean(field.custom?.[PLUGIN_NAMESPACE]?.input);
export const isRenderableHere = (field)=>TRANSPARENT_STRUCTURAL.has(field.type) || isUiOverride(field) || isFieldRenderable(field);
export const isObject = (v)=>typeof v === 'object' && v !== null && !Array.isArray(v);
export const parsePathSegments = (path)=>path.split('.').filter((s)=>s.length > 0).map((seg)=>{
        const n = Number(seg);
        return Number.isInteger(n) && String(n) === seg ? n : seg;
    });
export const getByPath = (root, path)=>{
    const segs = parsePathSegments(path);
    let cur = root;
    for (const seg of segs){
        if (cur === null || cur === undefined) return undefined;
        if (typeof seg === 'number') {
            if (!Array.isArray(cur)) return undefined;
            cur = cur[seg];
        } else {
            if (!isObject(cur)) return undefined;
            cur = cur[seg];
        }
    }
    return cur;
};
export const setByPath = (root, path, next)=>{
    const segs = parsePathSegments(path);
    if (segs.length === 0) return root;
    // Deep-clone the spine we touch — leave other branches by reference for
    // cheap structural sharing.
    const out = {
        ...root
    };
    let parent = out;
    for(let i = 0; i < segs.length - 1; i++){
        const seg = segs[i];
        const nextSeg = segs[i + 1];
        const childExpectsArray = typeof nextSeg === 'number';
        let child = parent[seg];
        if (childExpectsArray) {
            child = Array.isArray(child) ? [
                ...child
            ] : [];
        } else {
            child = isObject(child) ? {
                ...child
            } : {};
        }
        parent[seg] = child;
        parent = child;
    }
    parent[segs[segs.length - 1]] = next;
    return out;
};
export const topLevelOf = (path)=>{
    const idx = path.indexOf('.');
    return idx === -1 ? path : path.slice(0, idx);
};
/* Strip numeric array/blocks indices from a dotted path so it can be matched
   against a schema path. `items.3.label` → `items.label`. */ export const stripPathIndices = (path)=>path.replace(/\.\d+/g, '');
/* Walk the field schema once to collect the index-less paths that correspond
   to `localized: true` leaves. Block fields are unioned across all block slugs
   at the same path (a leaf is treated as localized if ANY block schema marks
   it so) — over-inclusive in mixed-block-config schemas but never
   under-inclusive, which is the safe direction. */ export const collectLocalizedSchemaPaths = (fields, prefix, out)=>{
    for (const f of fields){
        if (f.type === 'row' || f.type === 'collapsible') {
            if (f.fields) collectLocalizedSchemaPaths(f.fields, prefix, out);
            continue;
        }
        if (f.type === 'tabs') {
            for (const tab of f.tabs ?? []){
                const tabPrefix = tab.name ? `${prefix}${tab.name}.` : prefix;
                collectLocalizedSchemaPaths(tab.fields, tabPrefix, out);
            }
            continue;
        }
        if (!f.name) continue;
        const p = `${prefix}${f.name}`;
        if (f.localized) out.add(p);
        if (f.type === 'group' && f.fields) {
            collectLocalizedSchemaPaths(f.fields, `${p}.`, out);
            continue;
        }
        if (f.type === 'array' && f.fields) {
            collectLocalizedSchemaPaths(f.fields, `${p}.`, out);
            continue;
        }
        if (f.type === 'blocks' && f.blocks) {
            for (const block of f.blocks){
                collectLocalizedSchemaPaths(block.fields, `${p}.`, out);
            }
            continue;
        }
    }
};
/* Project every localized leaf in `values` to its active-locale slice. Returns
   a new doc-root object; non-localized leaves pass through by reference. Used
   at submit time so the PATCH body ships flat per-locale values that Payload's
   writer normalizes back into locale-keyed storage. */ export const projectLocaleAtLeaves = (values, fields, activeLocale)=>{
    const projectInObject = (obj, fieldList)=>{
        const out = {
            ...obj
        };
        for (const f of fieldList){
            if (f.type === 'row' || f.type === 'collapsible') {
                if (f.fields) {
                    const next = projectInObject(out, f.fields);
                    for (const k of Object.keys(next))out[k] = next[k];
                }
                continue;
            }
            if (f.type === 'tabs') {
                for (const tab of f.tabs ?? []){
                    if (tab.name) {
                        const v = out[tab.name];
                        if (isObject(v)) out[tab.name] = projectInObject(v, tab.fields);
                    } else {
                        const next = projectInObject(out, tab.fields);
                        for (const k of Object.keys(next))out[k] = next[k];
                    }
                }
                continue;
            }
            if (!f.name || !(f.name in out)) continue;
            const v = out[f.name];
            if (f.localized) {
                // Locale-keyed leaf: pick the active slice. Undefined means no value
                // saved for this locale yet (input rendered empty).
                out[f.name] = isObject(v) ? v[activeLocale] : v;
                continue;
            }
            if (f.type === 'group' && f.fields && isObject(v)) {
                out[f.name] = projectInObject(v, f.fields);
                continue;
            }
            if (f.type === 'array' && f.fields && Array.isArray(v)) {
                out[f.name] = v.map((row)=>isObject(row) ? projectInObject(row, f.fields) : row);
                continue;
            }
            if (f.type === 'blocks' && f.blocks && Array.isArray(v)) {
                out[f.name] = v.map((row)=>{
                    if (!isObject(row)) return row;
                    const blockType = typeof row.blockType === 'string' ? row.blockType : '';
                    const block = f.blocks.find((b)=>b.slug === blockType);
                    return block ? projectInObject(row, block.fields) : row;
                });
            }
        }
        return out;
    };
    return projectInObject(values, fields);
};

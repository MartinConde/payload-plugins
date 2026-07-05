/* Pure helpers owned by the doc-form bridge (AutoDocFormBridge) that aren't
   shared with FieldTreeRenderer/the bulk-edit drawer — required-field
   walking, create/submit body assembly, richText rekeying on row moves, and
   the JSON-parse-error sweep. Extracted verbatim, no behavior change. See
   fieldTree/sharedHelpers.ts for the field-visibility/path/locale helpers
   shared across both consumers. */ import { toast } from '../../internal/payloadAdapterUI.js';
import { isObject, isFieldRenderable, labelOf } from './fieldTree/sharedHelpers.js';
import { canRead, subPerms } from './access-control/fieldPermissions.js';
import { isJsonParseError, JSON_PARSE_ERROR_KEY } from './inputs/JsonInput.js';
export const isEmpty = (v)=>v === undefined || v === null || v === '' || Array.isArray(v) && v.length === 0;
/* On a failed save/publish, scroll to + focus the first errored field and toast
   a summary. Each field wrapper carries `data-field-path` (FieldTreeRenderer) —
   a stable scroll target that exists even for richText (whose inner input is
   Payload's pre-rendered element with its own id). The "first" error is the one
   earliest in DOM order — `errors` keys are inserted across several validation
   sources (required misses → auth → JSON sweep) so insertion order ≠ visual order. */ export const focusFirstError = (errs)=>{
    const keys = Object.keys(errs);
    if (keys.length === 0) return;
    toast.error(keys.length === 1 ? 'A required field needs your attention.' : `${keys.length} fields need your attention.`);
    if (typeof document === 'undefined') return;
    const found = keys.map((k)=>document.querySelector(`[data-field-path="${CSS.escape(k)}"]`)).filter((el)=>Boolean(el));
    if (found.length === 0) return;
    found.sort((a, b)=>a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    const target = found[0];
    target.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
    const focusable = target.querySelector('input, textarea, select, [contenteditable="true"]');
    (focusable ?? target).focus?.({
        preventScroll: true
    });
};
export const buildAuthCreateFields = ()=>[
        {
            type: 'text',
            name: '__password',
            label: 'Password',
            required: true
        },
        {
            type: 'text',
            name: '__confirmPassword',
            label: 'Confirm password',
            required: true
        }
    ];
/* Structural equality for JSON-ish values. Used by the autosave success
   cleanup to decide whether a dirty path is "still dirty" relative to the
   value the autosave PATCH actually shipped. References returned by
   `getByPath` are stable across `setByPath` mutations on disjoint paths
   (setByPath only clones the spine it touches), so reference equality is a
   fast pre-check; only structurally identical objects fall through to the
   recursive walk. */ export const deepEqual = (a, b)=>{
    if (a === b) return true;
    if (a === null || a === undefined || b === null || b === undefined) {
        return a === b;
    }
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for(let i = 0; i < a.length; i++){
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    if (typeof a === 'object') {
        const ao = a;
        const bo = b;
        const aKeys = Object.keys(ao);
        if (aKeys.length !== Object.keys(bo).length) return false;
        for (const k of aKeys){
            if (!deepEqual(ao[k], bo[k])) return false;
        }
        return true;
    }
    return false;
};
/* Finds a top-level-NAMED `blocks` field anywhere in the schema — including
   nested inside `tabs` (Pages.ts's `layout` lives inside an unnamed "Content"
   tab, not directly in `collection.fields`), `group`, `row`, or `collapsible`.
   Mirrors `collectLocalizedSchemaPaths`'s tree-walk. Does NOT descend into
   `array`/other `blocks` fields' own subfields — `layout` is never itself
   nested inside another blocks/array container in practice, and stopping
   there keeps this a cheap targeted lookup rather than a full-schema walk. */ export const findBlocksField = (fields, name)=>{
    for (const f of fields){
        if (f.type === 'blocks' && f.name === name) {
            return f;
        }
        if (f.type === 'row' || f.type === 'collapsible') {
            const found = f.fields && findBlocksField(f.fields, name);
            if (found) return found;
            continue;
        }
        if (f.type === 'tabs') {
            for (const tab of f.tabs ?? []){
                const found = findBlocksField(tab.fields, name);
                if (found) return found;
            }
            continue;
        }
        if (f.type === 'group' && f.fields) {
            const found = findBlocksField(f.fields, name);
            if (found) return found;
        }
    }
    return undefined;
};
/* Re-key richTextRendered entries when rows in an array/blocks at `arrayPath`
   are reordered or removed. For each entry whose key is `${arrayPath}.${i}.…`,
   look up the row's id at the OLD index, find its NEW index in nextIds, and
   rewrite the key. Entries for removed rows are dropped. Entries outside the
   array are passed through unchanged. */ export const rekeyRichTextOnRowMove = (current, arrayPath, prevIds, nextIds)=>{
    const prefix = `${arrayPath}.`;
    const nextIndexById = new Map();
    nextIds.forEach((id, i)=>{
        if (id !== null) nextIndexById.set(id, i);
    });
    const out = {};
    for (const [key, entry] of Object.entries(current)){
        if (!key.startsWith(prefix)) {
            out[key] = entry;
            continue;
        }
        const tail = key.slice(prefix.length);
        const dot = tail.indexOf('.');
        if (dot === -1) {
            // No subfield path after the index — unexpected for richText, keep.
            out[key] = entry;
            continue;
        }
        const idxStr = tail.slice(0, dot);
        const rest = tail.slice(dot + 1);
        const oldIdx = Number(idxStr);
        if (!Number.isInteger(oldIdx) || String(oldIdx) !== idxStr) {
            out[key] = entry;
            continue;
        }
        const id = prevIds[oldIdx];
        if (id === null || id === undefined) continue;
        const newIdx = nextIndexById.get(id);
        if (newIdx === undefined) continue; // row removed
        out[`${prefix}${newIdx}.${rest}`] = entry;
    }
    return out;
};
/* Recursively detect a JsonInput parse-error marker anywhere inside `value`.
   Returns the first path discovered (relative to `prefix`) or null. */ export const findJsonParseError = (value, prefix)=>{
    if (isJsonParseError(value)) {
        return {
            path: prefix,
            message: value[JSON_PARSE_ERROR_KEY]
        };
    }
    if (Array.isArray(value)) {
        for(let i = 0; i < value.length; i++){
            const hit = findJsonParseError(value[i], `${prefix}.${i}`);
            if (hit) return hit;
        }
        return null;
    }
    if (isObject(value)) {
        for (const [k, v] of Object.entries(value)){
            const hit = findJsonParseError(v, prefix ? `${prefix}.${k}` : k);
            if (hit) return hit;
        }
        return null;
    }
    return null;
};
/* Walk the field schema PLUS the current value tree to enumerate every
   required-leaf path that's currently empty. Recurses into row/collapsible
   transparently, into group/tabs (with name prefix), into array (one entry
   per row), and into blocks (per row's blockType -> matching block.fields).
   v3.7: `parentPerms` threads through alongside the schema walk; any
   read-denied leaf is skipped (the form hid it from the user, so it would
   be unrecoverable to fail submission on). */ export const collectRequiredEmptyPaths = (fields, values, prefix, parentPerms)=>{
    const out = [];
    for (const f of fields){
        if (f.type === 'row' || f.type === 'collapsible') {
            if (f.fields) {
                out.push(...collectRequiredEmptyPaths(f.fields, values, prefix, parentPerms));
            }
            continue;
        }
        if (f.type === 'group') {
            if (!f.name || !f.fields) continue;
            // Skip the whole group when the user can't read it (every leaf would
            // be unreachable anyway).
            if (!canRead(parentPerms, f.name)) continue;
            const childValue = isObject(values) ? values[f.name] : undefined;
            out.push(...collectRequiredEmptyPaths(f.fields, childValue, `${prefix}${f.name}.`, subPerms(parentPerms, f.name)));
            continue;
        }
        if (f.type === 'tabs') {
            for (const tab of f.tabs ?? []){
                if (tab.name) {
                    if (!canRead(parentPerms, tab.name)) continue;
                    const childValue = isObject(values) ? values[tab.name] : undefined;
                    out.push(...collectRequiredEmptyPaths(tab.fields, childValue, `${prefix}${tab.name}.`, subPerms(parentPerms, tab.name)));
                } else {
                    out.push(...collectRequiredEmptyPaths(tab.fields, values, prefix, parentPerms));
                }
            }
            continue;
        }
        if (f.type === 'array') {
            if (!f.name) continue;
            if (!canRead(parentPerms, f.name)) continue;
            const rows = isObject(values) ? values[f.name] : undefined;
            const arrayPerms = subPerms(parentPerms, f.name);
            if (Array.isArray(rows) && f.fields) {
                rows.forEach((row, idx)=>{
                    out.push(...collectRequiredEmptyPaths(f.fields, row, `${prefix}${f.name}.${idx}.`, arrayPerms));
                });
            }
            // Required arrays must have at least one row.
            if (f.required && (!Array.isArray(rows) || rows.length === 0)) {
                out.push({
                    name: f.name,
                    path: `${prefix}${f.name}`,
                    label: labelOf(f)
                });
            }
            continue;
        }
        if (f.type === 'blocks') {
            if (!f.name) continue;
            if (!canRead(parentPerms, f.name)) continue;
            const rows = isObject(values) ? values[f.name] : undefined;
            const blocksPerms = subPerms(parentPerms, f.name);
            if (Array.isArray(rows) && f.blocks) {
                rows.forEach((row, idx)=>{
                    if (!isObject(row)) return;
                    const blockType = typeof row.blockType === 'string' ? row.blockType : '';
                    const block = f.blocks.find((b)=>b.slug === blockType);
                    if (!block) return;
                    const perBlockPerms = blocksPerms && typeof blocksPerms === 'object' ? blocksPerms.blocks?.[blockType] : undefined;
                    out.push(...collectRequiredEmptyPaths(block.fields, row, `${prefix}${f.name}.${idx}.`, perBlockPerms));
                });
            }
            if (f.required && (!Array.isArray(rows) || rows.length === 0)) {
                out.push({
                    name: f.name,
                    path: `${prefix}${f.name}`,
                    label: labelOf(f)
                });
            }
            continue;
        }
        if (!isFieldRenderable(f)) continue;
        if (!f.required || !f.name) continue;
        // v3.7: skip required-check for fields the user can't see.
        if (!canRead(parentPerms, f.name)) continue;
        const v = isObject(values) ? values[f.name] : undefined;
        if (isEmpty(v)) {
            out.push({
                name: f.name,
                path: `${prefix}${f.name}`,
                label: labelOf(f)
            });
        }
    }
    return out;
};
export const seedDefaults = (fields)=>{
    const out = {};
    for (const f of fields){
        if (f.type === 'row' || f.type === 'collapsible') {
            if (f.fields) Object.assign(out, seedDefaults(f.fields));
            continue;
        }
        if (f.type === 'tabs') {
            for (const tab of f.tabs ?? []){
                if (!tab.name) {
                    // Unnamed tab — children flatten into the doc root.
                    Object.assign(out, seedDefaults(tab.fields));
                }
            }
            continue;
        }
        if (!f.name) continue;
        if (f.defaultValue !== undefined) {
            out[f.name] = f.defaultValue;
        }
    }
    return out;
};
/* Enumerate the top-level keys the create-mode body should ship — i.e. the
   set of keys that live at the doc root after Payload's flattening rules
   (row/collapsible transparent; named tabs nest under tab.name; unnamed tabs
   flatten their subfields into the root). */ export const collectTopLevelKeys = (fields)=>{
    const out = new Set();
    const visit = (list)=>{
        for (const f of list){
            if (f.type === 'row' || f.type === 'collapsible') {
                if (f.fields) visit(f.fields);
                continue;
            }
            if (f.type === 'tabs') {
                for (const tab of f.tabs ?? []){
                    if (tab.name) {
                        out.add(tab.name);
                    } else {
                        visit(tab.fields);
                    }
                }
                continue;
            }
            if (f.name) out.add(f.name);
        }
    };
    visit(fields);
    return out;
};

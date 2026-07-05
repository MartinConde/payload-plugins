'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* Client-side state for the auto doc form. Handles:
   - create (POST /api/{slug}) and edit (PATCH /api/{slug}/{id});
   - dirty tracking at the dotted-path level (e.g. myArray.0.label) so the
     UI can show subfield-granular indicators, paired with WHOLE-CONTAINER
     PATCH bodies (Payload's REST replaces arrays/blocks wholesale and
     expects full group/tab objects);
   - pre-submit required-field check that walks into array/blocks rows;
   - JSON-parse-error markers from JsonInput block submit and surface as
     inline path-keyed errors;
   - server-side error surfacing across both the flat { field, message } and
     the nested ValidationError.data.errors[{ path, message }] shapes,
     preserving the dotted path verbatim as the error key;
   - discard-changes UX (Discard button + beforeunload guard while dirty);
   - after-create navigation to the new doc's edit URL;
   - v3.6 drafts: Save-draft / Publish button matrix, autosave concurrency
     state machine (debounce + single-flight + path→value snapshot for
     correct dirty cleanup), Version history dialog. */ import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast, useDocumentDrawerContext, useDocumentInfo, useServerFunctions, useTranslation, useUploadHandlers } from '../../internal/payloadAdapter.js';
import { arrayMove } from '@dnd-kit/sortable';
import { Button, cn } from 'payload-plugin-shadcn-ui';
import { CollectionUploadHeader } from './upload/CollectionUploadHeader.js';
import { buildUploadFormData, parsePayloadErrorResponse } from './upload/uploadWireFormat.js';
import { DocStatusBar } from './drafts/DocStatusBar.js';
import { DocFormValuesProvider, DocIdentityProvider, LocaleProvider, PageBuilderProvider, ResizableHandle, ResizablePanel, ResizablePanelGroup, useIsMobile } from 'payload-plugin-shadcn-ui';
import { isJsonParseError, JSON_PARSE_ERROR_KEY } from './inputs/JsonInput.js';
import { isFieldSupportedForDocForm } from './eligibility/isSupportedForDocForm.js';
import { hasDraftsEnabled, getAutosaveInterval, shouldShowSaveDraftButton } from './drafts/draftsConfig.js';
import { SchedulePublishPopover } from './schedule/SchedulePublishPopover.js';
import { getSchedulePublishConfig } from './schedule/scheduleConfig.js';
import { LivePreviewPanel } from './live-preview/LivePreviewPanel.js';
import { BlockSettingsPanel } from './live-preview/BlockSettingsPanel.js';
import { newRow, ensureRowId } from './inputs/BlocksInput.js';
import { BlockPickerSheet } from './inputs/BlockPickerSheet.js';
import { canRead, subPerms } from './access-control/fieldPermissions.js';
import { extractRichTextRenderedFields } from './richtext/extractRichTextRenderedFields.js';
import { makeFieldTreeRenderer } from './fieldTree/FieldTreeRenderer.js';
const PLUGIN_NAMESPACE = 'plugin-shadcn-admin';
const SYSTEM_FIELD_NAMES = new Set([
    'id',
    'createdAt',
    'updatedAt',
    // Drafts add `_status` to the doc; the bridge owns publish/draft state
    // explicitly via submitMode and never echoes it in the PATCH body.
    '_status',
    // Auth-internal fields that should never appear in the doc form. The
    // synthesized `password` field is added separately for create-mode auth
    // collections (see below).
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
const labelOf = (field)=>field.label && field.label.length > 0 ? field.label : field.name ?? '';
const isFieldRenderable = (field)=>{
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
const TRANSPARENT_STRUCTURAL = new Set([
    'row',
    'collapsible',
    'group',
    'tabs'
]);
/* A `ui` field carrying our `.input` override is a presentational vessel for a
   custom component — renderable even though `ui` is outside the data field
   matrix (FieldTreeRenderer's renderChild renders it bare). */ const isUiOverride = (field)=>field.type === 'ui' && Boolean(field.custom?.[PLUGIN_NAMESPACE]?.input);
const isRenderableHere = (field)=>TRANSPARENT_STRUCTURAL.has(field.type) || isUiOverride(field) || isFieldRenderable(field);
const isEmpty = (v)=>v === undefined || v === null || v === '' || Array.isArray(v) && v.length === 0;
/* On a failed save/publish, scroll to + focus the first errored field and toast
   a summary. Each field wrapper carries `data-field-path` (FieldTreeRenderer) —
   a stable scroll target that exists even for richText (whose inner input is
   Payload's pre-rendered element with its own id). The "first" error is the one
   earliest in DOM order — `errors` keys are inserted across several validation
   sources (required misses → auth → JSON sweep) so insertion order ≠ visual order. */ const focusFirstError = (errs)=>{
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
const buildAuthCreateFields = ()=>[
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
const isObject = (v)=>typeof v === 'object' && v !== null && !Array.isArray(v);
/* Structural equality for JSON-ish values. Used by the autosave success
   cleanup to decide whether a dirty path is "still dirty" relative to the
   value the autosave PATCH actually shipped. References returned by
   `getByPath` are stable across `setByPath` mutations on disjoint paths
   (setByPath only clones the spine it touches), so reference equality is a
   fast pre-check; only structurally identical objects fall through to the
   recursive walk. */ const deepEqual = (a, b)=>{
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
const parsePathSegments = (path)=>path.split('.').filter((s)=>s.length > 0).map((seg)=>{
        const n = Number(seg);
        return Number.isInteger(n) && String(n) === seg ? n : seg;
    });
const getByPath = (root, path)=>{
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
const setByPath = (root, path, next)=>{
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
const topLevelOf = (path)=>{
    const idx = path.indexOf('.');
    return idx === -1 ? path : path.slice(0, idx);
};
/* v3.8 — strip numeric array/blocks indices from a dotted path so it can be
   matched against a schema path. `items.3.label` → `items.label`. Used to
   look up `field.localized` for paths that traverse repeating containers. */ const stripPathIndices = (path)=>path.replace(/\.\d+/g, '');
/* Finds a top-level-NAMED `blocks` field anywhere in the schema — including
   nested inside `tabs` (Pages.ts's `layout` lives inside an unnamed "Content"
   tab, not directly in `collection.fields`), `group`, `row`, or `collapsible`.
   Mirrors `collectLocalizedSchemaPaths`'s tree-walk just above. Does NOT
   descend into `array`/other `blocks` fields' own subfields — `layout` is
   never itself nested inside another blocks/array container in practice, and
   stopping there keeps this a cheap targeted lookup rather than a full-schema
   walk. */ const findBlocksField = (fields, name)=>{
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
/* v3.8 — walk the field schema once to collect the index-less paths that
   correspond to `localized: true` leaves. Used by `isPathLocalized` to decide
   whether a value at `path` is a locale-keyed object (`{en, fr, …}`) or a
   plain value. Block fields are unioned across all block slugs at the same
   path (a leaf is treated as localized if ANY block schema marks it so) —
   over-inclusive in mixed-block-config schemas but never under-inclusive,
   which is the safe direction (we'd just store a no-op locale object). */ const collectLocalizedSchemaPaths = (fields, prefix, out)=>{
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
/* v3.8 — project every localized leaf in `values` to its active-locale slice.
   Returns a new doc-root object; non-localized leaves pass through by
   reference. Used at submit time so the PATCH body ships flat per-locale
   values that Payload's writer normalizes back into locale-keyed storage. */ const projectLocaleAtLeaves = (values, fields, activeLocale)=>{
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
                // saved for this locale yet (input rendered empty — matches the v3.8
                // no-fallback-hint design).
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
/* Re-key richTextRendered entries when rows in an array/blocks at `arrayPath`
   are reordered or removed. For each entry whose key is `${arrayPath}.${i}.…`,
   look up the row's id at the OLD index, find its NEW index in nextIds, and
   rewrite the key. Entries for removed rows are dropped. Entries outside the
   array are passed through unchanged. */ const rekeyRichTextOnRowMove = (current, arrayPath, prevIds, nextIds)=>{
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
   Returns the first path discovered (relative to `prefix`) or null. */ const findJsonParseError = (value, prefix)=>{
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
   be unrecoverable to fail submission on). */ const collectRequiredEmptyPaths = (fields, values, prefix, parentPerms)=>{
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
const seedDefaults = (fields)=>{
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
   flatten their subfields into the root). */ const collectTopLevelKeys = (fields)=>{
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
export function AutoDocFormBridge({ mode, collectionSlug, globalSlug, docId, collection, useAsTitleBySlug, uploadCollectionsBySlug = {}, initialValues, initialRichTextRendered, operation: operationProp, initialUploadDoc, locales, defaultLocale, initialLocale }) {
    const { t } = useTranslation();
    const router = useRouter();
    const documentInfo = useDocumentInfo();
    const serverFunctions = useServerFunctions();
    // When this doc form is rendered inside Payload's nested DocumentDrawer (e.g.
    // "Create New" from a select drawer), the drawer provides an `onSave` callback
    // that inserts the saved doc into the originating field and closes the drawer.
    // In that context we must call it instead of navigating to the doc's edit page.
    // Outside a drawer the context defaults to `{}`, so both are undefined.
    const { onSave: onSaveFromDrawer, drawerSlug: docDrawerSlug } = useDocumentDrawerContext();
    const isInDocDrawer = Boolean(docDrawerSlug);
    // v3.23 — client-side direct upload. Non-null only when a storage adapter
    // registered a clientUploads handler for this collection; null → server
    // multipart (the default). Provided by Payload's app-wide UploadHandlers.
    const { getUploadHandler } = useUploadHandlers();
    // Globals are singletons: permanent edit-mode, upsert via POST, no doc id.
    const isGlobal = Boolean(globalSlug);
    const operation = operationProp ?? (mode === 'edit' ? 'update' : 'create');
    // Synthesized auth password fields, create-mode only.
    const authExtras = React.useMemo(()=>mode === 'create' && collection.auth ? buildAuthCreateFields() : [], [
        mode,
        collection.auth
    ]);
    const baseline = React.useMemo(()=>mode === 'create' ? {
            ...seedDefaults(collection.fields),
            ...initialValues
        } : {
            ...initialValues
        }, [
        mode,
        collection.fields,
        initialValues
    ]);
    const [values, setValues] = React.useState(baseline);
    const [dirty, setDirty] = React.useState(()=>new Set());
    const [errors, setErrors] = React.useState({});
    const [topError, setTopError] = React.useState(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [richTextRendered, setRichTextRendered] = React.useState(initialRichTextRendered ?? {});
    // v3.6 drafts state.
    const draftsEnabled = hasDraftsEnabled(collection);
    const autosaveInterval = getAutosaveInterval(collection);
    // When autosave is on, the form never stays dirty long enough for a manual
    // Discard to be useful (it re-disables a split second after enabling), so we
    // hide it entirely on autosave collections.
    const autosaveEnabled = draftsEnabled && autosaveInterval !== null;
    const showSaveDraft = shouldShowSaveDraftButton(collection);
    // Schedule-publish: present only when the consumer set
    // `versions.drafts.schedulePublish` (which is what registers the server-side
    // jobs task). A scheduled job needs an existing doc, so edit-mode only.
    const schedulePublishConfig = getSchedulePublishConfig(collection);
    const [status, setStatus] = React.useState('idle');
    const [lastSavedAt, setLastSavedAt] = React.useState(null);
    // Live Preview toggle — gated on the collection actually having opted in
    // (see `admin.livePreview` in the consumer's collection config). Create-mode
    // and globals are excluded: Payload's own live-preview URL resolution skips
    // `operation === 'create'` too (no doc to preview yet), and this starter's
    // panel only targets collection docs (see LivePreviewPanel + Pages.ts's
    // `/:id/preview-url` endpoint).
    const livePreviewEnabled = mode === 'edit' && !isGlobal && Boolean(collection.admin?.livePreview);
    const [livePreviewOpen, setLivePreviewOpen] = React.useState(false);
    // "Edit blocks" — the second, opt-in mode on top of plain Live Preview
    // (see LIVE-PREVIEW.md's "Preview-only vs builder mode"). Off by default:
    // opening Live Preview alone gives the old preview-only experience (no
    // clickable overlay in the iframe, no settings panel, main form fields
    // stay visible beside a 50/50 split) — this flips on the click-to-
    // select/reorder/duplicate/delete layer and takes over the full content
    // area, since main-form + preview + settings all at once is too cramped
    // to use. Declared up here (not beside the rest of the page-builder state
    // further down) because the panel-resize effect right below reads it.
    const [builderModeOpen, setBuilderModeOpen] = React.useState(false);
    // Below `md`, panels stack — dragging a resize handle on a touchscreen-width
    // form isn't useful, and react-resizable-panels' `orientation` prop is the
    // one thing here that genuinely needs a runtime check rather than a
    // Tailwind breakpoint (it drives the library's own layout math, not just
    // CSS).
    const isMobile = useIsMobile();
    const previewPanelRef = React.useRef(null);
    // The outer group's OTHER panel (main form fields). Only needed so builder
    // mode can collapse it to `0%` explicitly — plain `resize('100%')` on
    // `previewPanelRef` would be clamped by main's own `minSize="30%"`, since
    // that's a drag limit, not something an imperative `resize()` call
    // overrides. `collapse()` is the one call that bypasses `minSize` and jumps
    // straight to `collapsedSize` — the same reason `previewPanelRef` itself
    // uses `.collapse()` above rather than `.resize('0%')`.
    const mainPanelRef = React.useRef(null);
    // Animate only our own programmatic resize()/collapse() below, never a
    // user's drag (which must track the pointer 1:1) — flipped on right before
    // the imperative call and back off once the transition's had time to run.
    const [previewAnimating, setPreviewAnimating] = React.useState(false);
    React.useEffect(()=>{
        const previewPanel = previewPanelRef.current;
        const mainPanel = mainPanelRef.current;
        if (!previewPanel || !mainPanel) return;
        setPreviewAnimating(true);
        // Bare numbers are pixels to this library (only unit-suffixed strings —
        // or unitless strings, which it treats as "%" — are percentages), so
        // `50` here would resize to 50px, not 50%.
        //
        // Both panels are driven EXPLICITLY in every branch below — this isn't
        // redundant. The original 2-state version of this effect only ever
        // touched `previewPanel`, relying on `resize()`/`collapse()` trading
        // space with its ONE sibling to bring `mainPanel` along for free — true
        // as long as `mainPanel` was NEVER itself explicitly collapsed. Now that
        // builder mode DOES explicitly `mainPanel.collapse()` it, a transition
        // straight from builder mode to fully-closed (or back to preview-only)
        // skips the 50/50 middle state entirely, and the panel that was never
        // told to move again (implicitly relying on "the trade already handled
        // it") was left stuck at its stale 0%/collapsed size — a razor-thin
        // sliver, not the intended layout. Always setting both explicitly (the
        // shrinking side via `collapse()`, which is the one call that bypasses
        // `minSize` and can reach a true 0%, followed by the growing side's
        // `resize()` to its exact target) makes every transition correct
        // regardless of which two states it's moving between.
        if (!livePreviewOpen) {
            previewPanel.collapse();
            mainPanel.resize('100%');
        } else if (builderModeOpen) {
            // Builder mode: main collapses to 0%, preview takes the full 100% —
            // the "takes over the entire content area" layout the page-builder
            // needs (see LIVE-PREVIEW.md).
            mainPanel.collapse();
            previewPanel.resize('100%');
        } else {
            // Preview-only: the original 50/50 split.
            mainPanel.resize('50%');
            previewPanel.resize('50%');
        }
        const timeout = setTimeout(()=>setPreviewAnimating(false), 300);
        return ()=>clearTimeout(timeout);
    }, [
        livePreviewOpen,
        builderModeOpen
    ]);
    // Upload-collection state. The dropzone owns visual file state; the bridge
    // carries it across to the submit branch.
    const isUploadCollection = Boolean(collection.upload);
    const uploadConfig = isUploadCollection ? collection.upload : null;
    const [pendingFile, setPendingFile] = React.useState(null);
    const [uploadEdits, setUploadEdits] = React.useState(null);
    // Whether the user touched the upload region (file replaced or edits made).
    // Drives the multipart branch and feeds dirty-state for the Discard button.
    const uploadDirty = pendingFile !== null || uploadEdits !== null;
    // Autosave is hard-skipped while a file is staged — multipart over an
    // 800ms loop would be disruptive and Payload's PATCH-multipart is much
    // heavier than the JSON path.
    const autosavePaused = uploadDirty;
    // Hold a live ref to current values for the async rebuild — `getFormState`
    // fires after a debounce, by which time `values` may have moved.
    const valuesRef = React.useRef(values);
    React.useEffect(()=>{
        valuesRef.current = values;
    }, [
        values
    ]);
    const dirtyRef = React.useRef(dirty);
    React.useEffect(()=>{
        dirtyRef.current = dirty;
    }, [
        dirty
    ]);
    // ── v3.8 — localization state ─────────────────────────────────────────────
    // Multi-locale projects render a LocaleSwitcher in the header and partition
    // dirty/values per locale. When `locales` is undefined or has a single
    // entry, the bridge runs in single-locale mode (back-compat with v3.7).
    const localizationEnabled = Boolean(locales && locales.length > 1);
    // v3.8 — `versions.drafts.localizeStatus: true` enables per-locale
    // draft/published status (experimental in Payload 3.84.1). Used to gate
    // the `publishSpecificLocale` query param on single-locale publish and to
    // render the `[Publish all locales]` action.
    const localizeStatusEnabled = (()=>{
        if (!draftsEnabled) return false;
        const cfg = collection.versions?.drafts;
        return typeof cfg === 'object' && cfg.localizeStatus === true;
    })();
    const fallbackLocale = defaultLocale ?? (locales && locales[0] ? locales[0].code : null);
    const [activeLocale, setActiveLocale] = React.useState(localizationEnabled ? initialLocale ?? fallbackLocale : null);
    const activeLocaleRef = React.useRef(activeLocale);
    React.useEffect(()=>{
        activeLocaleRef.current = activeLocale;
    }, [
        activeLocale
    ]);
    // Index-less paths whose leaves are `localized: true`. Used by
    // `isPathLocalized` to decide whether to read/write the locale slice, and by
    // `hasLocalizedFields` to gate the locale switcher (no point switching
    // locales on a doc/global with nothing localized).
    const localizedSchemaPaths = React.useMemo(()=>{
        const out = new Set();
        collectLocalizedSchemaPaths(collection.fields, '', out);
        return out;
    }, [
        collection.fields
    ]);
    // True only when localization is configured AND the schema actually has a
    // localized field. A doc/global with zero localized fields shows no locale
    // switcher (gated like the Versions tab) — switching locales would be a no-op.
    const hasLocalizedFields = localizedSchemaPaths.size > 0;
    const showLocaleSwitcher = localizationEnabled && hasLocalizedFields;
    const isPathLocalized = React.useCallback((path)=>localizationEnabled && localizedSchemaPaths.has(stripPathIndices(path)), [
        localizationEnabled,
        localizedSchemaPaths
    ]);
    // ── Page-builder layer (see LIVE-PREVIEW.md) ────────────────────────────
    // Click-to-select/reorder/duplicate/delete/add blocks, driven from the
    // Live Preview iframe's own floating toolbar rather than this form. Scoped
    // to the `pages` collection's `layout` blocks field — the same scope the
    // rest of Live Preview already has (apps/web's `ALLOWED_COLLECTIONS` hard-
    // codes `pages`); this just makes that scoping explicit admin-side too.
    // `layout` isn't necessarily a TOP-level field — Pages.ts nests it inside
    // an unnamed "Content" tab (`collectLocalizedSchemaPaths` above already has
    // to walk this same shape for the same reason: an unnamed tab contributes
    // no path segment, so `layout`'s VALUE path is still bare `layout`, but its
    // FIELD DEFINITION isn't in `collection.fields` directly).
    const layoutField = React.useMemo(()=>findBlocksField(collection.fields, 'layout'), [
        collection.fields
    ]);
    // Whether this collection HAS the page-builder layer wired up at all —
    // a static per-collection capability, never toggled at runtime. Keeps the
    // nested (preview | settings) `ResizablePanelGroup` below permanently
    // mounted for `pages` regardless of the "Edit blocks" toggle
    // (`builderModeOpen`, below) — swapping THIS flag at runtime would remount
    // `LivePreviewPanel` (reloading the iframe, losing `detachedWindowRef`),
    // so it must only ever reflect collection shape, not UI state.
    const pageBuilderAvailable = livePreviewEnabled && collectionSlug === 'pages' && Boolean(layoutField);
    const [selectedBlockId, setSelectedBlockId] = React.useState(null);
    const pageBuilderCtx = React.useMemo(()=>({
            selectedBlockId,
            setSelectedBlockId
        }), [
        selectedBlockId
    ]);
    // Closing the preview leaves no visual reference for what was selected —
    // clear it (and drop out of builder mode) rather than let either go
    // stale. Without clearing `selectedBlockId`, re-opening later (or even
    // just the settings panel's collapse effect below, which also keys off
    // `builderModeOpen`) would leave `BlockSettingsPanel` believing something
    // is still selected while its panel is collapsed to `0%`, reintroducing
    // the bleed-past-a-zero-width-box issue its doc comment describes.
    React.useEffect(()=>{
        if (!livePreviewOpen) {
            setSelectedBlockId(null);
            setBuilderModeOpen(false);
        }
    }, [
        livePreviewOpen
    ]);
    // Leaving builder mode (preview still open) drops the selection the same
    // way — nothing in preview-only mode can select a block (no overlay
    // installed in the iframe at all, see `pageBuilder` query param below), so
    // a stale `selectedBlockId` from before exiting would only ever cause the
    // same bleed-past-zero-width issue on re-entry.
    React.useEffect(()=>{
        if (!builderModeOpen) setSelectedBlockId(null);
    }, [
        builderModeOpen
    ]);
    // Locale-aware base path for `layout`'s rows — mirrors how
    // `makeFieldTreeRenderer`'s `renderField` computes `childBasePath` for a
    // localized array/blocks field, rather than hardcoding `'layout'`. Kept in
    // sync with that logic so this stays correct if `layout` is ever localized.
    const layoutBasePath = layoutField?.localized && localizationEnabled && activeLocale ? `layout.${activeLocale}` : 'layout';
    // Normalized mirror of `values` at `layoutBasePath` — same shape/defaulting
    // `BlocksInput` uses internally, kept independent here since the settings
    // panel and the block-action handlers below both need to read/index it
    // without going through that component.
    const layoutRows = React.useMemo(()=>{
        if (!pageBuilderAvailable) return [];
        const raw = getByPath(values, layoutBasePath);
        if (!Array.isArray(raw)) return [];
        return raw.map((r)=>r && typeof r === 'object' ? ensureRowId(r) : ensureRowId({}));
    }, [
        pageBuilderAvailable,
        values,
        layoutBasePath
    ]);
    const layoutFieldPerms = React.useMemo(()=>layoutField ? subPerms(documentInfo.docPermissions, 'layout') : undefined, [
        layoutField,
        documentInfo.docPermissions
    ]);
    // Settings-panel `ResizablePanel`, same resize()/collapse()-on-effect
    // pattern as `previewPanelRef` above — expands when a block is selected
    // AND the preview is actually open, collapses otherwise.
    //
    // Lives in a NESTED `ResizablePanelGroup` (preview | settings) INSIDE the
    // outer preview panel, rather than as a 3rd sibling of the outer group's
    // (main | preview) pair — this is load-bearing, not a style choice.
    // `react-resizable-panels`' imperative `panel.resize()` only ever trades
    // space with that panel's ONE adjacent sibling (its internal pivot is
    // `[index, index+1]`, i.e. exactly the two panels either side of a single
    // drag handle) — it does not redistribute across the whole group. With 3
    // flat siblings [main, preview, settings], calling `preview.resize('50%')`
    // tried to take the space from its NEW neighbor `settings` (index+1)
    // instead of `main` — and since `settings` starts collapsed at 0% with
    // nothing to give, the resize was silently rejected and preview stayed at
    // 0%, which fed back through its `onResize` handler as `asPercentage: 0`
    // and immediately re-closed `livePreviewOpen` — a fixed-point that made
    // the toggle button look inert. Confirmed by reading the installed
    // `react-resizable-panels` source directly (`resize()`'s `pivotIndices`
    // computation), not guessed from docs. Nesting keeps every group at
    // exactly 2 panels, so each resize call's adjacent-pair math is exactly
    // the same shape this file already had working for (main | preview) before
    // this feature existed.
    //
    // Gating on `builderModeOpen` too (not just a selected block) matters: with
    // the panel group's required `overflow: visible` (sticky positioning), any
    // panel collapsed to `0%` must have NOTHING rendered inside it, or that
    // content visibly bleeds out past its own zero-width box instead of being
    // clipped — see BlockSettingsPanel's own doc comment on this. Only ever
    // touched when `pageBuilderAvailable`, so it's a no-op for every other
    // collection. Preview-only mode (`builderModeOpen` false) can never have a
    // `selectedBlockId` anyway — the iframe doesn't even install the click
    // overlay in that mode (see `pageBuilder` query param below) — but the
    // explicit check keeps this panel's collapsed state correct through the
    // brief window while `selectedBlockId` is being cleared on mode-exit.
    const blockSettingsPanelRef = React.useRef(null);
    const [blockSettingsAnimating, setBlockSettingsAnimating] = React.useState(false);
    React.useEffect(()=>{
        if (!pageBuilderAvailable) return;
        const panel = blockSettingsPanelRef.current;
        if (!panel) return;
        const shouldOpen = builderModeOpen && Boolean(selectedBlockId);
        // Skip a redundant call when already in the desired state — harmless
        // now that this panel's group is properly isolated (2 panels), but
        // still avoids pointless work/animation-flag churn on unrelated
        // re-renders (e.g. every keystroke touches `builderModeOpen`'s deps via
        // re-render, not just real open/close transitions).
        if (shouldOpen === !panel.isCollapsed()) return;
        setBlockSettingsAnimating(true);
        // Sized relative to the INNER group (preview | settings), which now
        // occupies the OUTER group's full ~100% in builder mode (not ~50%, as
        // when this ratio was first tuned for the 3-panel case) — 35% of that
        // full width keeps the settings column a similar absolute size to
        // before, without crowding out the embedded preview.
        if (shouldOpen) panel.resize('35%');
        else panel.collapse();
        const timeout = setTimeout(()=>setBlockSettingsAnimating(false), 300);
        return ()=>clearTimeout(timeout);
    }, [
        selectedBlockId,
        pageBuilderAvailable,
        builderModeOpen
    ]);
    // Per-locale dirty marker for localized paths. `dirty` (Set<string>) stays
    // as the union — drives "any dirty?" UX. `dirtyLocalesRef` tells us WHICH
    // locales of a given path are dirty. Non-localized paths have no entry.
    const dirtyLocalesRef = React.useRef(new Map());
    // Re-baseline when initial values change (e.g. server navigation back to
    // this view with a fresh doc payload).
    React.useEffect(()=>{
        setValues(baseline);
        setDirty(new Set());
        dirtyLocalesRef.current = new Map();
        setErrors({});
        setTopError(null);
        setStatus('idle');
        setLastSavedAt(null);
        setRichTextRendered(initialRichTextRendered ?? {});
        setPendingFile(null);
        setUploadEdits(null);
    }, [
        baseline,
        initialRichTextRendered
    ]);
    // beforeunload guard while dirty (field-level OR upload region).
    React.useEffect(()=>{
        if (dirty.size === 0 && !uploadDirty) return;
        const handler = (e)=>{
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return ()=>window.removeEventListener('beforeunload', handler);
    }, [
        dirty.size,
        uploadDirty
    ]);
    // Debounced richText-rebuild orchestration. When the user mutates an
    // array/blocks structurally (add/remove/reorder row), we ask Payload's
    // `getFormState` server function to rebuild form state for the whole
    // collection and we lift fresh `customComponents.Field` elements out of
    // the response into `richTextRendered`. This is exactly the pattern
    // Payload's own admin uses on row-add.
    const rebuildTimerRef = React.useRef(null);
    const rebuildAbortRef = React.useRef(null);
    const requestRichTextRebuild = React.useCallback((opts)=>{
        if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
        // v3.8 locale-switch fires `immediate: true` so the editor swap doesn't
        // wait the 200ms structural-debounce. Row mutations keep the debounce.
        const delay = opts?.immediate ? 0 : 200;
        rebuildTimerRef.current = setTimeout(async ()=>{
            if (rebuildAbortRef.current) rebuildAbortRef.current.abort();
            const ctrl = new AbortController();
            rebuildAbortRef.current = ctrl;
            try {
                let docPreferences = {};
                try {
                    if (typeof documentInfo.getDocPreferences === 'function') {
                        docPreferences = await documentInfo.getDocPreferences();
                    }
                } catch  {
                // Fall through with empty preferences.
                }
                if (ctrl.signal.aborted) return;
                // v3.8 — when a locale is requested, project doc-root values down to
                // that locale before handing to getFormState; the server expects
                // flat per-locale data when `locale !== 'all'`.
                const rebuildLocale = opts?.locale ?? activeLocaleRef.current ?? undefined;
                const data = rebuildLocale ? projectLocaleAtLeaves(valuesRef.current, collection.fields, rebuildLocale) : valuesRef.current;
                const result = await serverFunctions.getFormState({
                    signal: ctrl.signal,
                    // Payload keys form-state schema lookup on `schemaPath`, which is
                    // the collectionSlug OR globalSlug (verified against Payload's
                    // Document view). globals pass `globalSlug` + `schemaPath: slug`.
                    ...isGlobal ? {
                        globalSlug,
                        schemaPath: globalSlug
                    } : {
                        collectionSlug,
                        schemaPath: collectionSlug
                    },
                    data: data,
                    operation,
                    docPermissions: documentInfo.docPermissions,
                    docPreferences: docPreferences,
                    renderAllFields: true,
                    ...rebuildLocale ? {
                        locale: rebuildLocale
                    } : {}
                });
                if (ctrl.signal.aborted) return;
                const nextFormState = result.state;
                if (!nextFormState) return;
                const nextRendered = extractRichTextRenderedFields(collection, valuesRef.current, nextFormState);
                setRichTextRendered(nextRendered);
            } catch (err) {
                if (err?.name === 'AbortError') return;
                // eslint-disable-next-line no-console
                console.warn('[shadcn-admin] richText form-state rebuild failed', err);
            }
        }, delay);
    }, [
        collection,
        collectionSlug,
        globalSlug,
        isGlobal,
        documentInfo,
        operation,
        serverFunctions
    ]);
    React.useEffect(()=>()=>{
            if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
            if (rebuildAbortRef.current) rebuildAbortRef.current.abort();
        }, []);
    const setValueAtPath = React.useCallback((path, next)=>{
        // v3.8 — localized leaves store a `{locale: value}` object at `path`;
        // a write to the path replaces ONLY the active locale's slice. The row
        // ids of array/blocks containers are non-localized, so the structural
        // diff below runs against `next` as-is regardless of locale.
        const localized = isPathLocalized(path);
        const writeLocale = localized ? activeLocaleRef.current : null;
        // Structural diff for array values (used to drive richText rekey +
        // rebuild). Row ids live at the row level — non-localized by design —
        // so the diff is safe to run before the locale projection.
        const rowId = (r)=>isObject(r) && (typeof r.id === 'string' || typeof r.id === 'number') ? String(r.id) : null;
        const prev = getByPath(valuesRef.current, path);
        if (Array.isArray(next)) {
            const prevIds = Array.isArray(prev) ? prev.map(rowId) : [];
            const nextIds = next.map(rowId);
            const structural = prevIds.length !== nextIds.length || prevIds.some((id, i)=>id !== nextIds[i]);
            if (structural) {
                setRichTextRendered((current)=>rekeyRichTextOnRowMove(current, path, prevIds, nextIds));
                requestRichTextRebuild();
            }
        }
        setValues((prevValues)=>{
            if (writeLocale) {
                // Merge into the locale-keyed object at `path` instead of replacing.
                const currentLocaleObj = getByPath(prevValues, path);
                const merged = isObject(currentLocaleObj) ? {
                    ...currentLocaleObj,
                    [writeLocale]: next
                } : {
                    [writeLocale]: next
                };
                return setByPath(prevValues, path, merged);
            }
            return setByPath(prevValues, path, next);
        });
        setDirty((prevDirty)=>{
            const copy = new Set(prevDirty);
            copy.add(path);
            return copy;
        });
        if (writeLocale) {
            const set = dirtyLocalesRef.current.get(path) ?? new Set();
            set.add(writeLocale);
            dirtyLocalesRef.current.set(path, set);
        }
        setErrors((prevErrors)=>{
            if (!(path in prevErrors)) return prevErrors;
            const copy = {
                ...prevErrors
            };
            delete copy[path];
            return copy;
        });
    }, [
        isPathLocalized,
        requestRichTextRebuild
    ]);
    // ── Page-builder block actions ──────────────────────────────────────────
    // Driven from the Live Preview iframe's floating toolbar via
    // LivePreviewPanel's `onBlockAction`. All route through the same
    // `setValueAtPath(layoutBasePath, nextArray)` every other field write goes
    // through — its structural array-diff above (keyed on row `id`) already
    // handles richText rekey on reorder, so a plain splice is enough; there's
    // no separate "blocks mutation" API to call, unlike payload-better-editor's
    // dedicated MOVE_ROW/DUPLICATE_ROW/REMOVE_ROW form-reducer actions (this
    // bridge has no such reducer — every write is just a value replacement).
    const [addBlockPickerOpen, setAddBlockPickerOpen] = React.useState(false);
    const [addAfterBlockId, setAddAfterBlockId] = React.useState(null);
    const moveBlock = (blockId, dir)=>{
        const idx = layoutRows.findIndex((r)=>r.id === blockId);
        if (idx < 0) return;
        const nextIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= layoutRows.length) return;
        setValueAtPath(layoutBasePath, arrayMove(layoutRows, idx, nextIdx));
    };
    const duplicateBlock = (blockId)=>{
        const idx = layoutRows.findIndex((r)=>r.id === blockId);
        if (idx < 0) return;
        const clone = {
            ...layoutRows[idx],
            id: globalThis.crypto?.randomUUID?.() ?? `block-${Math.random().toString(36).slice(2, 10)}`
        };
        const next = [
            ...layoutRows
        ];
        next.splice(idx + 1, 0, clone);
        setValueAtPath(layoutBasePath, next);
        setSelectedBlockId(clone.id);
    };
    const deleteBlock = (blockId)=>{
        setValueAtPath(layoutBasePath, layoutRows.filter((r)=>r.id !== blockId));
        setSelectedBlockId((current)=>current === blockId ? null : current);
    };
    const requestAddBlock = (afterBlockId)=>{
        setAddAfterBlockId(afterBlockId);
        setAddBlockPickerOpen(true);
    };
    // `BlockPickerSheet`'s `onSelect` — constructs the new row the same way
    // `BlocksInput`'s own "+ Add block" button does (`newRow`, exported for
    // exactly this reuse), so a page-builder-added block and a form-added
    // block are indistinguishable afterward.
    const handleBlockPicked = (slug)=>{
        const block = layoutField?.blocks?.find((b)=>b.slug === slug);
        if (!block) return;
        const row = newRow(block);
        const insertAt = addAfterBlockId == null ? 0 : (()=>{
            const idx = layoutRows.findIndex((r)=>r.id === addAfterBlockId);
            return idx < 0 ? layoutRows.length : idx + 1;
        })();
        const next = [
            ...layoutRows
        ];
        next.splice(insertAt, 0, row);
        setValueAtPath(layoutBasePath, next);
        // A brand-new row may render as nothing in the preview until its
        // required fields are filled in — auto-select regardless so the
        // settings panel opens right away rather than leaving the user unsure
        // anything happened.
        setSelectedBlockId(row.id);
    };
    const handlePageBuilderAction = (action)=>{
        if (action.action === 'move') moveBlock(action.blockId, action.dir);
        else if (action.action === 'duplicate') duplicateBlock(action.blockId);
        else if (action.action === 'delete') deleteBlock(action.blockId);
        else if (action.action === 'addRequest') requestAddBlock(action.afterBlockId);
    };
    const discard = ()=>{
        setValues(baseline);
        setDirty(new Set());
        dirtyLocalesRef.current = new Map();
        setErrors({});
        setTopError(null);
        setStatus('idle');
        setPendingFile(null);
        setUploadEdits(null);
    };
    // v3.8 — locale switch handler. Persisting both en+fr+de values in `values`
    // means switching is a client-only re-render; we only need to rebuild the
    // richText pre-rendered Field elements for the new locale (they're rendered
    // per-active-locale by getFormState).
    const onLocaleChange = React.useCallback((next)=>{
        if (next === activeLocale) return;
        setActiveLocale(next);
        // Fire the rebuild immediately (no debounce) so the editor swap is
        // visible without a noticeable lag.
        requestRichTextRebuild({
            locale: next,
            immediate: true
        });
    }, [
        activeLocale,
        requestRichTextRebuild
    ]);
    // ── v3.6 autosave concurrency state ────────────────────────────────────
    const autosaveTimerRef = React.useRef(null);
    const autosaveAbortRef = React.useRef(null);
    const manualSaveInFlightRef = React.useRef(false);
    // Path→value snapshot captured at autosave submit time. Used by the
    // success cleanup to decide whether a dirty path is still dirty relative
    // to what the autosave PATCH actually shipped. References returned by
    // getByPath are stable across setByPath mutations on disjoint paths, so
    // deep-equality is the correct compare here.
    const autosaveSnapshotRef = React.useRef(null);
    // v3.8 — locale active at autosave snapshot time. Used by cleanup to scope
    // the dirtyLocales prune to the locale we actually shipped (a locale
    // switch mid-flight must not blow away the user's edits in the new locale).
    const autosaveSnapshotLocaleRef = React.useRef(null);
    const autosaveInFlightRef = React.useRef(false);
    const submit = React.useCallback(async (submitMode)=>{
        const isAutosave = submitMode === 'autosave';
        const isPublishAllLocales = submitMode === 'publishAllLocales';
        // ── Manual modes acquire the "manual save in flight" lock and abort
        //    any pending/in-flight autosave so we don't double-PATCH. ────────
        if (!isAutosave) {
            manualSaveInFlightRef.current = true;
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
            if (autosaveAbortRef.current) {
                autosaveAbortRef.current.abort();
                autosaveAbortRef.current = null;
            }
            autosaveInFlightRef.current = false;
            setTopError(null);
        }
        // ── Autosave guards: must be edit mode (have an id), no in-flight
        //    autosave or manual save, and at least one dirty path. Manual
        //    saves do their own validation below. ─────────────────────────────
        if (isAutosave) {
            // Globals autosave too (singleton upsert, no id). Collections require
            // an id (edit mode) — create-mode has nothing to PATCH yet.
            if (!isGlobal && (mode !== 'edit' || docId === undefined)) return;
            if (manualSaveInFlightRef.current) return;
            if (autosaveInFlightRef.current) return;
            if (autosavePaused) return;
            const currentDirty = dirtyRef.current;
            if (currentDirty.size === 0) return;
        }
        // ── Manual-mode pre-submit checks. Autosave skips these entirely —
        //    drafts permit invalid data, and we never want to block typing. ──
        // v3.8 — hoist locale state outside the autosave/manual branch; the
        // required-empty walk (manual mode) and the body builder (both modes)
        // both consume the projected values. publish-all sends a flat
        // (active-locale-projected) body too — Payload's `publishAllLocales`
        // flag flips `_status[*]` to "published" using each locale's existing
        // drafts data, so the body only needs to carry the active locale.
        const submitLocale = activeLocaleRef.current;
        const projectedValues = localizationEnabled && submitLocale ? projectLocaleAtLeaves(values, collection.fields, submitLocale) : values;
        if (!isAutosave) {
            // 1. Required-field pre-submit check (walks array/blocks rows).
            //    v3.7: pass docPermissions so read-denied required fields don't
            //    block submit (the user can't see them to fill them in).
            //    v3.8: localized required fields are checked against the active
            //    locale's slice — `{en:"hi", fr:""}` is empty in fr.
            //    v3.8: for publish-all, the server validates EVERY locale (one
            //    pass per locale). Pre-check the same way so the user sees a
            //    clear "required in <locale>" error instead of an inline error
            //    on a field they've already filled in the active locale.
            if (isPublishAllLocales && locales && locales.length > 0) {
                const missing = [];
                for (const loc of locales){
                    const projectedForLocale = projectLocaleAtLeaves(values, collection.fields, loc.code);
                    const misses = collectRequiredEmptyPaths(collection.fields, projectedForLocale, '', documentInfo.docPermissions);
                    for (const m of misses)missing.push(`${m.label} (${loc.code})`);
                }
                if (missing.length > 0) {
                    setTopError(`Cannot publish all locales — required fields missing: ${missing.join(', ')}`);
                    toast.error(`Cannot publish all locales — ${missing.length} required field${missing.length === 1 ? '' : 's'} missing.`);
                    manualSaveInFlightRef.current = false;
                    return;
                }
            }
            const requiredMisses = collectRequiredEmptyPaths(collection.fields, projectedValues, '', documentInfo.docPermissions);
            const nextErrors = {};
            for (const miss of requiredMisses){
                nextErrors[miss.path] = 'This field is required.';
            }
            // 2. Auth create-mode extras.
            if (mode === 'create' && collection.auth) {
                const p = values.__password;
                const cp = values.__confirmPassword;
                if (isEmpty(p)) nextErrors.__password = 'This field is required.';
                if (isEmpty(cp)) {
                    nextErrors.__confirmPassword = 'This field is required.';
                }
                if (typeof p === 'string' && typeof cp === 'string' && p !== cp) {
                    nextErrors.__confirmPassword = 'Passwords do not match.';
                }
            }
            // 2b. Upload-collection create requires a file. Edit mode is fine
            //     without one (metadata-only updates allowed).
            if (mode === 'create' && isUploadCollection && !pendingFile) {
                setTopError('A file is required to create this document.');
                toast.error('A file is required to create this document.');
                if (Object.keys(nextErrors).length > 0) setErrors(nextErrors);
                manualSaveInFlightRef.current = false;
                return;
            }
            // 3. JSON parse-error sweep — any marker anywhere in `values` blocks
            //    submit and surfaces as a path-keyed error.
            for (const [k, v] of Object.entries(values)){
                const hit = findJsonParseError(v, k);
                if (hit) {
                    nextErrors[hit.path] = `Invalid JSON: ${hit.message}`;
                }
            }
            if (Object.keys(nextErrors).length > 0) {
                setErrors(nextErrors);
                focusFirstError(nextErrors);
                manualSaveInFlightRef.current = false;
                return;
            }
            setSubmitting(true);
            setStatus('saving');
        } else {
            autosaveInFlightRef.current = true;
            setStatus('autosaving');
        }
        try {
            let body;
            if (mode === 'create') {
                body = {};
                for (const name of collectTopLevelKeys(collection.fields)){
                    if (SYSTEM_FIELD_NAMES.has(name)) continue;
                    const v = projectedValues[name];
                    if (v === undefined) continue;
                    body[name] = v;
                }
                if (collection.auth) {
                    if (typeof values.__password === 'string') {
                        body.password = values.__password;
                    }
                }
            } else {
                // Edit mode: send the WHOLE current value of each dirty top-level
                // container. Payload's REST replaces arrays/blocks wholesale and
                // expects full group/tab objects, so per-path partials aren't a
                // valid wire shape.
                // v3.8: PUBLISH and PUBLISH-ALL-LOCALES ship every top-level key
                // (not just dirty) because Payload's publish flow validates the
                // full doc on every locale being published — autosave may have
                // already cleared `dirty`, leaving an empty body that the server
                // rejects with spurious "required" errors. Save / saveDraft /
                // autosave keep the dirty-only optimization.
                body = {};
                const isPublishMode = submitMode === 'publish' || isPublishAllLocales;
                let keys;
                if (isPublishMode) {
                    keys = collectTopLevelKeys(collection.fields);
                } else {
                    keys = new Set();
                    for (const path of isAutosave ? dirtyRef.current : dirty){
                        keys.add(topLevelOf(path));
                    }
                }
                for (const name of keys){
                    if (SYSTEM_FIELD_NAMES.has(name)) continue;
                    const v = projectedValues[name];
                    if (v === undefined) continue;
                    body[name] = v;
                }
                // v3.8 — Payload's own PublishButton sends `_status: 'published'`
                // as a body override on every publish op (single + all-locales).
                // With `experimental.localizeStatus`, this is what actually flips
                // the per-locale published flag; without it, `?publishSpecificLocale`
                // alone leaves _status untouched and the doc keeps reading as draft.
                if (isPublishMode) {
                    body._status = 'published';
                }
            }
            // Merge crop / focalPoint edits onto the body if the user opened the
            // EditUpload dialog. Payload accepts these as regular doc fields on
            // both POST and PATCH for upload collections. Autosave never enters
            // here (autosavePaused short-circuits above when uploadEdits is set).
            if (uploadEdits && !isAutosave) {
                if (uploadEdits.crop) body.crop = uploadEdits.crop;
                if (uploadEdits.focalPoint) body.focalPoint = uploadEdits.focalPoint;
            }
            // ── Path→value snapshot for autosave success cleanup ───────────────
            // v3.8 — snapshot the PROJECTED value (active-locale slice for
            // localized leaves) so deepEqual at cleanup time compares the same
            // shape the user is currently editing. Capturing the locale here
            // means a locale switch mid-flight cleans up the right slice.
            if (isAutosave) {
                const snap = new Map();
                for (const path of dirtyRef.current){
                    snap.set(path, getByPath(projectedValues, path));
                }
                autosaveSnapshotRef.current = snap;
                autosaveSnapshotLocaleRef.current = submitLocale;
            }
            // ── URL with drafts/autosave/locale query branch ────────────────────
            // Mirrors @payloadcms/ui's PublishButton wire shape so the experimental
            // `localizeStatus` flow lands correctly:
            //   - publish + localizeStatus: ?locale=<active>&publishSpecificLocale=<active>
            //   - publishAllLocales + localizeStatus: ?locale=<active>&publishAllLocales=true
            //   - publish (no localizeStatus): ?draft=false
            //   - saveDraft: ?draft=true
            //   - autosave: ?draft=true&autosave=true
            const url = (()=>{
                // Globals upsert at `/api/globals/{slug}` (no id, always POST).
                // Collections POST `/api/{slug}` on create, PATCH `/api/{slug}/{id}`
                // on edit. The draft/autosave/publish/locale query params below are
                // identical across both (verified against Payload's PublishButton).
                const base = isGlobal ? `/api/globals/${globalSlug}` : mode === 'create' ? `/api/${collectionSlug}` : `/api/${collectionSlug}/${docId}`;
                const params = [];
                if (submitMode === 'saveDraft') params.push('draft=true');
                else if (submitMode === 'autosave') params.push('draft=true', 'autosave=true');
                else if (submitMode === 'publish' && !localizeStatusEnabled) params.push('draft=false');
                if (localizationEnabled && submitLocale) {
                    params.push(`locale=${encodeURIComponent(submitLocale)}`);
                }
                if (isPublishAllLocales) {
                    params.push('publishAllLocales=true');
                } else if (submitMode === 'publish' && localizeStatusEnabled) {
                    params.push(`publishSpecificLocale=${encodeURIComponent(submitLocale ?? '')}`);
                }
                return params.length === 0 ? base : `${base}?${params.join('&')}`;
            })();
            // Wire-format branch:
            // - upload collection + (create-with-file OR edit-with-new-file) →
            //   multipart/form-data with `_payload` (JSON of body) + `file` parts.
            //   Don't set Content-Type — fetch adds the boundary.
            // - everything else (incl. upload-collection metadata-only edit AND
            //   any autosave) → JSON.
            const useMultipart = !isAutosave && isUploadCollection && pendingFile !== null;
            // Autosave runs with an AbortController so a subsequent manual save
            // (or unmount) cancels it cleanly.
            const ctrl = isAutosave ? new AbortController() : null;
            if (ctrl) autosaveAbortRef.current = ctrl;
            // v3.23 — resolve the multipart body. When a clientUploads handler is
            // registered for this collection (e.g. R2 with `clientUploads: true`),
            // `buildUploadFormData` uploads the file straight to the bucket and
            // sends metadata-only JSON in the `file` part; otherwise the raw binary
            // File (server-side multipart, the default). Shared with UploadNewDialog
            // so the client-direct path can't drift between the two call sites.
            const multipartBody = useMultipart && pendingFile ? await buildUploadFormData({
                body,
                file: pendingFile,
                collectionSlug: collectionSlug,
                getUploadHandler: getUploadHandler
            }) : null;
            const res = await fetch(url, {
                // Globals always POST (upsert). Collections POST on create, PATCH
                // on edit.
                method: isGlobal || mode === 'create' ? 'POST' : 'PATCH',
                credentials: 'include',
                signal: ctrl?.signal,
                ...multipartBody ? {
                    body: multipartBody
                } : {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            });
            if (!res.ok) {
                // Payload returns 4xx in two shapes:
                //   1. Flat: { errors: [{ field, message }] }
                //   2. ValidationError-nested:
                //      { errors: [{ name: 'ValidationError', message, data: {
                //          errors: [{ path, message }] } }] }
                // Path values may be dotted (myArray.0.label); we preserve them
                // verbatim as the error key so subfield renderers can look them up.
                let parsed = {};
                try {
                    parsed = await res.json();
                } catch  {
                // Body not JSON.
                }
                if (isAutosave) {
                    // Quiet autosave failure: surface only via the status bar.
                    // Don't clobber manual save errors. Don't open the inline error
                    // banner — the user is mid-typing.
                    setStatus('error');
                    // eslint-disable-next-line no-console
                    console.warn('[shadcn-admin] autosave failed', parsed.message ?? res.status);
                    return;
                }
                const { fieldErrors, fallback } = parsePayloadErrorResponse(parsed);
                if (Object.keys(fieldErrors).length > 0) {
                    setErrors(fieldErrors);
                    focusFirstError(fieldErrors);
                }
                if (fallback || parsed.message) {
                    setTopError(fallback ?? parsed.message ?? `Save failed (${res.status})`);
                    if (Object.keys(fieldErrors).length === 0) {
                        toast.error(fallback ?? parsed.message ?? `Save failed (${res.status})`);
                    }
                } else if (Object.keys(fieldErrors).length === 0) {
                    setTopError(`Save failed (${res.status})`);
                    toast.error(`Save failed (${res.status})`);
                }
                setStatus('error');
                return;
            }
            // 2xx — parse the doc so we know the new id (create) and clear dirty.
            // The full doc is also kept so a drawer onSave can insert it.
            let createdId;
            let savedDoc;
            try {
                const ok = await res.json();
                savedDoc = ok.doc;
                createdId = ok.doc?.id;
            } catch  {
            // No JSON body — fall through.
            }
            if (isAutosave) {
                // Path→value cleanup: only drop dirty paths whose CURRENT projected
                // value still deep-equals what we shipped at snapshot time.
                // v3.8 — the snapshot is locale-scoped (captured at submit time);
                // for localized paths, comparison projects current values down to
                // the snapshot's locale, and dirty-cleanup removes that locale from
                // dirtyLocales[path]; the path itself drops from `dirty` only when
                // no locales remain dirty.
                const snap = autosaveSnapshotRef.current;
                const snapLocale = autosaveSnapshotLocaleRef.current;
                autosaveSnapshotRef.current = null;
                autosaveSnapshotLocaleRef.current = null;
                if (snap) {
                    const projectedNow = localizationEnabled && snapLocale ? projectLocaleAtLeaves(valuesRef.current, collection.fields, snapLocale) : valuesRef.current;
                    setDirty((prev)=>{
                        let changed = false;
                        const next = new Set();
                        for (const path of prev){
                            if (!snap.has(path)) {
                                next.add(path);
                                continue;
                            }
                            const current = getByPath(projectedNow, path);
                            if (deepEqual(current, snap.get(path))) {
                                changed = true;
                                if (snapLocale) {
                                    const set = dirtyLocalesRef.current.get(path);
                                    if (set) {
                                        set.delete(snapLocale);
                                        if (set.size === 0) dirtyLocalesRef.current.delete(path);
                                        else {
                                            // Other locales still dirty — keep path in dirty Set.
                                            next.add(path);
                                        }
                                    }
                                }
                                continue;
                            }
                            next.add(path);
                        }
                        return changed ? next : prev;
                    });
                }
                setStatus('saved');
                setLastSavedAt(Date.now());
                return;
            }
            // Manual save success path.
            // - Single-locale (or no localization): full dirty reset (v3.7
            //   behavior).
            // - Multi-locale per-locale save: locale-scoped — drop the saved
            //   locale from dirtyLocales[path] for each dirty path; the path
            //   itself drops from `dirty` only if no other locale remains dirty.
            // - Multi-locale publish-all: full reset (every locale was shipped).
            if (localizationEnabled && submitLocale && !isPublishAllLocales) {
                setDirty((prev)=>{
                    const next = new Set();
                    for (const path of prev){
                        const set = dirtyLocalesRef.current.get(path);
                        if (set) {
                            set.delete(submitLocale);
                            if (set.size === 0) dirtyLocalesRef.current.delete(path);
                            else {
                                next.add(path);
                                continue;
                            }
                        }
                    // Non-localized dirty path: cleared by this save.
                    }
                    return next;
                });
            } else {
                setDirty(new Set());
                dirtyLocalesRef.current = new Map();
            }
            setErrors({});
            setPendingFile(null);
            setUploadEdits(null);
            setStatus('saved');
            setLastSavedAt(Date.now());
            toast.success(isPublishAllLocales ? t('shadcnAdmin:publishedAllLocalesToast') : submitMode === 'publish' ? t('shadcnAdmin:publishedToast') : submitMode === 'saveDraft' ? t('shadcnAdmin:draftSavedToast') : mode === 'create' ? t('shadcnAdmin:createdToast') : t('shadcnAdmin:savedToast'));
            if (isInDocDrawer && typeof onSaveFromDrawer === 'function') {
                // Inside the nested document drawer: hand the saved doc back to the
                // drawer (it inserts into the originating field and closes itself)
                // rather than navigating. Mirrors Payload's own Edit view in a drawer.
                const docForDrawer = savedDoc ?? {
                    id: createdId
                };
                await onSaveFromDrawer({
                    doc: docForDrawer,
                    operation: mode === 'create' ? 'create' : 'update',
                    result: docForDrawer
                });
            } else if (isGlobal) {
                // Singleton — stay put, just refresh server data.
                router.refresh();
            } else if (mode === 'create' && createdId !== undefined) {
                router.push(`/admin/collections/${collectionSlug}/${createdId}`);
            } else if (mode === 'edit') {
                router.refresh();
            } else {
                router.push(`/admin/collections/${collectionSlug}`);
            }
        } catch (err) {
            if (err?.name === 'AbortError') {
                // Autosave was cancelled (manual save took over or unmount). Don't
                // surface anything to the user.
                return;
            }
            if (isAutosave) {
                setStatus('error');
                // eslint-disable-next-line no-console
                console.warn('[shadcn-admin] autosave failed', err);
                return;
            }
            setTopError(err instanceof Error ? err.message : 'Save failed');
            setStatus('error');
        } finally{
            if (isAutosave) {
                autosaveInFlightRef.current = false;
            } else {
                manualSaveInFlightRef.current = false;
                setSubmitting(false);
            }
        }
    }, [
        collection.fields,
        collection.auth,
        collectionSlug,
        globalSlug,
        isGlobal,
        mode,
        docId,
        isUploadCollection,
        pendingFile,
        uploadEdits,
        values,
        dirty,
        router,
        autosavePaused
    ]);
    // ── Autosave scheduler ────────────────────────────────────────────────
    // Debounce against value/dirty changes. When drafts + autosave are on,
    // schedule a single autosave per quiet window. Skip when paused, when a
    // manual save is in flight, when there's nothing dirty, and when we're
    // on a create view (no id to PATCH).
    React.useEffect(()=>{
        if (!draftsEnabled || autosaveInterval === null) return;
        // Globals autosave (singleton, no id); collections require edit-mode + id.
        if (!isGlobal && (mode !== 'edit' || docId === undefined)) return;
        if (autosavePaused) return;
        if (manualSaveInFlightRef.current) return;
        if (dirty.size === 0) return;
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(()=>{
            autosaveTimerRef.current = null;
            void submit('autosave');
        }, autosaveInterval);
        return ()=>{
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
        };
    }, [
        draftsEnabled,
        autosaveInterval,
        isGlobal,
        mode,
        docId,
        autosavePaused,
        dirty,
        values,
        submit
    ]);
    // Cancel in-flight autosave + clear scheduler on unmount.
    React.useEffect(()=>()=>{
            if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
            if (autosaveAbortRef.current) autosaveAbortRef.current.abort();
        }, []);
    // Field-tree recursion (renderField + renderChild) is shared with the
    // list-view bulk-edit drawer via makeFieldTreeRenderer — see
    // fieldTree/FieldTreeRenderer. The bridge owns its state and passes the read
    // side in; the write side is the single setValueAtPath callback.
    const { renderField, renderChild } = makeFieldTreeRenderer({
        values,
        errors,
        activeLocale,
        localizationEnabled,
        disabled: submitting,
        setValueAtPath,
        richTextRendered,
        useAsTitleBySlug,
        uploadCollectionsBySlug,
        operation,
        // When the page-builder settings panel is actually ON SCREEN (builder
        // mode, not just preview-only), don't ALSO render `layout`'s fields in
        // the main form — a collapsed `SortableRow` in `BlocksInput` stays
        // mounted (grid `0fr`, not unmount), so rendering the same block fields
        // in both places at once would double-mount every richText editor in
        // the layout. Gated on `builderModeOpen`, not `livePreviewOpen`:
        // preview-ONLY mode (the default once Live Preview is open) shows
        // `layout` right here via the ordinary `BlocksInput` — there's no
        // settings panel to have taken it over in that mode, and the main form
        // stays fully visible beside the preview. Only entering builder mode
        // (which hides the main form's content wrapper entirely, see below)
        // moves `layout`'s editor into BlockSettingsPanel. `layout` isn't
        // necessarily top-level (Pages.ts nests it inside a tab), so this has to
        // be checked at the point every field bottoms out (`renderField`), not by
        // filtering `collection.fields` — see `skipField`'s own doc comment.
        skipField: pageBuilderAvailable && builderModeOpen ? (field)=>field.type === 'blocks' && field.name === 'layout' : undefined
    });
    const visibleTopLevel = React.useMemo(()=>collection.fields.filter(isRenderableHere), [
        collection.fields
    ]);
    // Partition top-level fields into main vs sidebar columns, mirroring
    // Payload's DocumentFields (fieldIsSidebar = admin.position === 'sidebar').
    // Top-level only — nested fields are never pulled out of their container.
    const { mainTop, sidebarTop } = React.useMemo(()=>{
        const main = [];
        const sidebar = [];
        for (const f of visibleTopLevel){
            if (f.admin?.position === 'sidebar') sidebar.push(f);
            else main.push(f);
        }
        return {
            mainTop: main,
            sidebarTop: sidebar
        };
    }, [
        visibleTopLevel
    ]);
    const hasSidebar = sidebarTop.length > 0;
    const hasDirty = dirty.size > 0 || uploadDirty;
    // ── Derived doc status from the value tree (`_status` is the truth of
    //    record on a drafts-enabled doc). Falls back to null when drafts are
    //    off; the status bar renders nothing in that case anyway.
    //    v3.8: with `experimental.localizeStatus`, `_status` comes back as a
    //    locale-keyed object (`{en: "published", fr: "draft", de: …}`); read
    //    the active locale's slice.
    const docStatus = (()=>{
        if (!draftsEnabled) return null;
        let s = values._status;
        if (localizeStatusEnabled && isObject(s) && activeLocale && activeLocale in s) {
            s = s[activeLocale];
        }
        return s === 'draft' || s === 'published' ? s : null;
    })();
    // v3.8.1 — per-locale status map for DocStatusBar's per-locale pill row.
    // `_status` may be either a flat string (legacy / pre-publish) or a
    // locale-keyed object (after publish-all or other localizeStatus writes).
    // Normalize to `{[locale]: 'draft' | 'published'}` so non-active pills can
    // render their persisted state.
    const perLocaleStatus = React.useMemo(()=>{
        if (!localizeStatusEnabled || !localizationEnabled || !locales) return undefined;
        const raw = values._status;
        const out = {};
        const normalize = (v)=>v === 'published' ? 'published' : 'draft';
        if (isObject(raw)) {
            for (const loc of locales){
                out[loc.code] = normalize(raw[loc.code]);
            }
        } else {
            // Flat string — assume same status across all locales (pre-localizeStatus
            // state, or doc that's never been touched).
            const fallback = normalize(raw);
            for (const loc of locales)out[loc.code] = fallback;
        }
        return out;
    }, [
        localizeStatusEnabled,
        localizationEnabled,
        locales,
        values._status
    ]);
    // Bound submit handlers per button — keeps the JSX clean.
    const onClickSave = ()=>{
        if (!submitting) void submit('save');
    };
    const onClickSaveDraft = ()=>{
        if (!submitting) void submit('saveDraft');
    };
    const onClickPublish = ()=>{
        if (!submitting) void submit('publish');
    };
    const onClickPublishAllLocales = ()=>{
        if (!submitting) void submit('publishAllLocales');
    };
    // v3.8 — `[Publish all locales]` is offered when localizeStatus is on AND
    // multiple locales are configured.
    const showPublishAllLocales = localizeStatusEnabled && localizationEnabled && mode === 'edit';
    const localeCtx = React.useMemo(()=>({
            activeLocale
        }), [
        activeLocale
    ]);
    const docIdentityCtx = React.useMemo(()=>({
            collectionSlug: collectionSlug ?? null,
            documentId: docId ?? null
        }), [
        collectionSlug,
        docId
    ]);
    const docFormValuesCtx = React.useMemo(()=>({
            values,
            activeLocale,
            setValueAtPath,
            lastSavedAt
        }), [
        values,
        activeLocale,
        setValueAtPath,
        lastSavedAt
    ]);
    // Shared between the plain and Resizable-wrapped layouts below so the two
    // don't drift out of sync.
    const mainFieldsContent = /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
            isUploadCollection && uploadConfig ? /*#__PURE__*/ _jsx(CollectionUploadHeader, {
                mode: mode,
                // Upload header only renders for upload COLLECTIONS (globals are
                // never upload entities), so collectionSlug is always defined here.
                collectionSlug: collectionSlug,
                uploadConfig: uploadConfig,
                uploadCollectionsBySlug: uploadCollectionsBySlug,
                useAsTitleBySlug: useAsTitleBySlug,
                existing: initialUploadDoc ?? null,
                pendingFile: pendingFile,
                onPendingFileChange: setPendingFile,
                uploadEdits: uploadEdits,
                onUploadEditsChange: setUploadEdits,
                disabled: submitting
            }) : null,
            mainTop.map((f)=>renderChild(f, '', documentInfo.docPermissions)),
            authExtras.map((f)=>renderField(f, ''))
        ]
    });
    return /*#__PURE__*/ _jsx(LocaleProvider, {
        value: localeCtx,
        children: /*#__PURE__*/ _jsx(DocIdentityProvider, {
            value: docIdentityCtx,
            children: /*#__PURE__*/ _jsx(DocFormValuesProvider, {
                value: docFormValuesCtx,
                children: /*#__PURE__*/ _jsx(PageBuilderProvider, {
                    value: pageBuilderCtx,
                    children: /*#__PURE__*/ _jsxs("form", {
                        noValidate: true,
                        onSubmit: (e)=>{
                            e.preventDefault();
                            if (submitting) return;
                            // Default submit (Enter key etc.) — pick the most-saved mode for
                            // drafts-on collections (Publish), or plain save otherwise.
                            if (draftsEnabled) {
                                void submit('publish');
                            } else {
                                void submit('save');
                            }
                        },
                        className: "flex flex-col",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "sticky top-0 z-30 -mx-6 -mt-6 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "flex flex-wrap items-center gap-3",
                                        children: /*#__PURE__*/ _jsx(DocStatusBar, {
                                            draftsEnabled: draftsEnabled,
                                            docStatus: docStatus,
                                            dirty: hasDirty,
                                            status: status,
                                            lastSavedAt: lastSavedAt,
                                            autosavePaused: autosavePaused,
                                            locales: locales,
                                            activeLocale: activeLocale,
                                            perLocaleStatus: perLocaleStatus,
                                            // Segmented locale switcher only when this doc actually has localized
                                            // fields; otherwise switching is a no-op and we show the status pill.
                                            onLocaleChange: showLocaleSwitcher ? onLocaleChange : undefined,
                                            switchDisabled: submitting,
                                            bare: true
                                        })
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex flex-wrap items-center justify-end gap-2",
                                        children: [
                                            livePreviewEnabled ? /*#__PURE__*/ _jsx(Button, {
                                                type: "button",
                                                variant: "outline",
                                                size: "sm",
                                                onClick: ()=>setLivePreviewOpen((o)=>!o),
                                                "aria-pressed": livePreviewOpen,
                                                // Closing the preview out from under an open builder-mode
                                                // session is what produced the stuck/sliver layout bug this
                                                // comment is next to — the panel-resize effect above now
                                                // handles that transition correctly regardless, but forcing
                                                // "Exit block editor" first is still the clearer path for a
                                                // user: closing Live Preview while mid-edit-a-block is
                                                // surprising UX even when the layout itself no longer breaks.
                                                disabled: builderModeOpen,
                                                title: builderModeOpen ? t('shadcnAdmin:exitBuilderModeFirst') : undefined,
                                                children: livePreviewOpen ? t('shadcnAdmin:hidePreview') : t('shadcnAdmin:livePreview')
                                            }) : null,
                                            pageBuilderAvailable && livePreviewOpen ? /*#__PURE__*/ _jsx(Button, {
                                                type: "button",
                                                variant: "outline",
                                                size: "sm",
                                                onClick: ()=>setBuilderModeOpen((o)=>!o),
                                                "aria-pressed": builderModeOpen,
                                                children: builderModeOpen ? t('shadcnAdmin:exitBuilderMode') : t('shadcnAdmin:builderMode')
                                            }) : null,
                                            draftsEnabled && schedulePublishConfig && mode === 'edit' ? /*#__PURE__*/ _jsx(SchedulePublishPopover, {
                                                collectionSlug: collectionSlug,
                                                globalSlug: globalSlug,
                                                docId: docId,
                                                isGlobal: isGlobal,
                                                locales: locales,
                                                timeIntervals: schedulePublishConfig.timeIntervals,
                                                disabled: submitting
                                            }) : null,
                                            autosaveEnabled ? null : /*#__PURE__*/ _jsx(Button, {
                                                type: "button",
                                                variant: "outline",
                                                size: "sm",
                                                onClick: discard,
                                                disabled: submitting || !hasDirty,
                                                children: t('shadcnAdmin:discard')
                                            }),
                                            draftsEnabled ? /*#__PURE__*/ _jsxs(_Fragment, {
                                                children: [
                                                    showSaveDraft ? /*#__PURE__*/ _jsx(Button, {
                                                        type: "button",
                                                        variant: "secondary",
                                                        size: "sm",
                                                        onClick: onClickSaveDraft,
                                                        disabled: submitting,
                                                        children: submitting ? `${t('general:saving')}…` : t('version:saveDraft')
                                                    }) : null,
                                                    /*#__PURE__*/ _jsx(Button, {
                                                        type: "button",
                                                        size: "sm",
                                                        onClick: onClickPublish,
                                                        disabled: submitting,
                                                        children: submitting ? `${t('version:publishing')}…` : showPublishAllLocales ? `${t('version:publish')} (${activeLocale ?? ''})` : t('version:publish')
                                                    }),
                                                    showPublishAllLocales ? /*#__PURE__*/ _jsx(Button, {
                                                        type: "button",
                                                        size: "sm",
                                                        variant: "secondary",
                                                        onClick: onClickPublishAllLocales,
                                                        disabled: submitting,
                                                        children: submitting ? `${t('version:publishing')}…` : t('version:publishAllLocales')
                                                    }) : null
                                                ]
                                            }) : /*#__PURE__*/ _jsx(Button, {
                                                type: "button",
                                                size: "sm",
                                                onClick: onClickSave,
                                                disabled: submitting,
                                                children: submitting ? mode === 'create' ? `${t('shadcnAdmin:creating')}…` : `${t('general:saving')}…` : mode === 'create' ? t('general:create') : t('general:save')
                                            })
                                        ]
                                    })
                                ]
                            }),
                            topError ? /*#__PURE__*/ _jsx("div", {
                                className: "mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive",
                                children: topError
                            }) : null,
                            livePreviewEnabled ? // Always inside a ResizablePanelGroup once the collection has Live
                            // Preview wired up — even while it's closed (collapsed to 0). That
                            // way toggling it only ever resizes/collapses panels; it never swaps
                            // out the surrounding tree (see the effect above driving
                            // `previewPanelRef`), so the form fields never remount mid-edit.
                            //
                            // `overflow: visible` overrides react-resizable-panels' own default
                            // (`hidden` on the group, `auto` on each panel) on both the group and
                            // every panel below. That default assumes a fixed-height container
                            // with each panel scrolling independently inside it; this form is a
                            // normal long scrolling page instead, and the doc-sidebar's/preview's
                            // `sticky` positioning (further down) only works against the page's
                            // own scroll — any ancestor with non-`visible` overflow becomes its
                            // own scroll container and breaks that.
                            /*#__PURE__*/ _jsxs(ResizablePanelGroup, {
                                orientation: isMobile ? 'vertical' : 'horizontal',
                                className: "items-stretch gap-0",
                                style: {
                                    overflow: 'visible'
                                },
                                children: [
                                    /*#__PURE__*/ _jsx(ResizablePanel, {
                                        panelRef: mainPanelRef,
                                        // `collapsible`/`collapsedSize="0%"` so builder mode can take
                                        // this down to a true 0 via `.collapse()` — a plain `resize()`
                                        // call would stop at `minSize` instead (see `mainPanelRef`'s doc
                                        // comment above). `minSize` stays as the drag limit for the
                                        // ordinary preview-only 2-panel case; builder mode never drags
                                        // this, it only ever calls `.collapse()`/`.resize()`
                                        // imperatively.
                                        collapsible: true,
                                        collapsedSize: "0%",
                                        defaultSize: "100%",
                                        minSize: "30%",
                                        className: cn('min-w-0', previewAnimating && 'transition-[flex-basis] duration-300 ease-in-out'),
                                        style: {
                                            overflow: 'visible'
                                        },
                                        children: /*#__PURE__*/ _jsxs("div", {
                                            className: cn('flex flex-col gap-6', hasSidebar && !livePreviewOpen && 'lg:flex-row', livePreviewOpen && 'lg:pr-6', builderModeOpen && 'hidden'),
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: hasSidebar ? 'flex flex-1 min-w-0 flex-col gap-4' : 'contents',
                                                    children: mainFieldsContent
                                                }),
                                                hasSidebar ? // Beside the main fields when the preview is closed (today's
                                                // layout, unchanged); drops below them once the preview
                                                // opens, so the main/preview split gets that width back.
                                                /*#__PURE__*/ _jsxs("div", {
                                                    className: cn('flex flex-col gap-4', livePreviewOpen ? 'border-t pt-4' : 'shrink-0 lg:sticky lg:top-16 lg:w-72 lg:border-l lg:pl-6'),
                                                    children: [
                                                        livePreviewOpen ? /*#__PURE__*/ _jsx("span", {
                                                            className: "text-sm font-medium text-muted-foreground",
                                                            children: t('shadcnAdmin:sidebarFields')
                                                        }) : null,
                                                        sidebarTop.map((f)=>renderChild(f, '', documentInfo.docPermissions))
                                                    ]
                                                }) : null
                                            ]
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx(ResizableHandle, {
                                        withHandle: true,
                                        className: cn((!livePreviewOpen || builderModeOpen) && 'hidden')
                                    }),
                                    /*#__PURE__*/ _jsx(ResizablePanel, {
                                        panelRef: previewPanelRef,
                                        collapsible: true,
                                        collapsedSize: "0%",
                                        defaultSize: "0%",
                                        minSize: "25%",
                                        className: cn('min-w-0', previewAnimating && 'transition-[flex-basis] duration-300 ease-in-out'),
                                        style: {
                                            overflow: 'visible'
                                        },
                                        // Dragging the handle can collapse this panel directly (below
                                        // its minSize snaps to collapsedSize) without going through the
                                        // toggle button — keep `livePreviewOpen` (and the button's
                                        // label) in sync either way. Also fires from our own
                                        // resize()/collapse() calls above and on mount; setting the same
                                        // boolean value React already has is a no-op. Only ever wired to
                                        // `livePreviewOpen`, not `builderModeOpen` — builder mode is
                                        // button-driven only (the handle that would let a user drag it
                                        // is hidden in that state, see above), so there's no drag
                                        // gesture here to sync back from.
                                        onResize: (size)=>setLivePreviewOpen(size.asPercentage > 0),
                                        children: /*#__PURE__*/ _jsx("div", {
                                            className: livePreviewOpen ? 'h-full lg:pl-6' : undefined,
                                            children: pageBuilderAvailable ? // Nested group, not a 3rd flat sibling of (main | preview) —
                                            // `react-resizable-panels`' imperative `resize()` only trades
                                            // space with ONE adjacent sibling, so the settings panel needs
                                            // its own 2-panel group to correctly take space from the
                                            // preview alone. See `blockSettingsPanelRef`'s doc comment
                                            // above for the full story (this is the fix for a real bug,
                                            // not a style preference).
                                            /*#__PURE__*/ _jsxs(ResizablePanelGroup, {
                                                orientation: isMobile ? 'vertical' : 'horizontal',
                                                className: "h-full items-stretch gap-0",
                                                style: {
                                                    overflow: 'visible'
                                                },
                                                children: [
                                                    /*#__PURE__*/ _jsx(ResizablePanel, {
                                                        defaultSize: "100%",
                                                        minSize: "40%",
                                                        className: "min-w-0",
                                                        style: {
                                                            overflow: 'visible'
                                                        },
                                                        children: /*#__PURE__*/ _jsx(LivePreviewPanel, {
                                                            open: livePreviewOpen,
                                                            onBlockAction: handlePageBuilderAction,
                                                            builderMode: builderModeOpen
                                                        })
                                                    }),
                                                    /*#__PURE__*/ _jsx(ResizableHandle, {
                                                        withHandle: true,
                                                        className: cn(!selectedBlockId && 'hidden')
                                                    }),
                                                    /*#__PURE__*/ _jsx(ResizablePanel, {
                                                        panelRef: blockSettingsPanelRef,
                                                        collapsible: true,
                                                        collapsedSize: "0%",
                                                        defaultSize: "0%",
                                                        minSize: "25%",
                                                        className: cn('min-w-0', blockSettingsAnimating && 'transition-[flex-basis] duration-300 ease-in-out'),
                                                        style: {
                                                            overflow: 'visible'
                                                        },
                                                        children: /*#__PURE__*/ _jsx("div", {
                                                            className: selectedBlockId ? 'h-full lg:pl-6' : undefined,
                                                            children: /*#__PURE__*/ _jsx(BlockSettingsPanel, {
                                                                rows: layoutRows,
                                                                blocks: layoutField?.blocks ?? [],
                                                                layoutBasePath: layoutBasePath,
                                                                renderChild: renderChild,
                                                                blockPerms: layoutFieldPerms,
                                                                disabled: submitting
                                                            })
                                                        })
                                                    })
                                                ]
                                            }) : /*#__PURE__*/ _jsx(LivePreviewPanel, {
                                                open: livePreviewOpen
                                            })
                                        })
                                    })
                                ]
                            }) : // No Live Preview on this collection — today's plain two-column
                            // split, no Resizable overhead.
                            /*#__PURE__*/ _jsxs("div", {
                                className: hasSidebar ? 'flex flex-col gap-6 lg:flex-row' : 'flex flex-col gap-4',
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: hasSidebar ? 'flex flex-1 min-w-0 flex-col gap-4' : 'contents',
                                        children: mainFieldsContent
                                    }),
                                    hasSidebar ? // The <aside> stretches to the row height so its left divider runs
                                    // the full form length; the inner wrapper is the sticky part —
                                    // pinned just below the sticky toolbar so the sidebar fields follow
                                    // the scroll while they fit, and scroll off naturally when taller
                                    // than the viewport (no inner scrollbar).
                                    /*#__PURE__*/ _jsx("aside", {
                                        className: "shrink-0 lg:w-72 lg:border-l lg:pl-6",
                                        children: /*#__PURE__*/ _jsx("div", {
                                            className: "flex flex-col gap-4 lg:sticky lg:top-16",
                                            children: sidebarTop.map((f)=>renderChild(f, '', documentInfo.docPermissions))
                                        })
                                    }) : null
                                ]
                            }),
                            pageBuilderAvailable ? /*#__PURE__*/ _jsx(BlockPickerSheet, {
                                open: addBlockPickerOpen,
                                onOpenChange: setAddBlockPickerOpen,
                                blocks: layoutField?.blocks ?? [],
                                onSelect: handleBlockPicked
                            }) : null
                        ]
                    })
                })
            })
        })
    });
}

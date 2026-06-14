/* Serializable subset of a Payload collection/field that survives RSC→Client.
   Strips functions (validators, hooks, label fns) but keeps the data both the
   auto-columns builder and the auto doc form need. Shared between
   AutoCollectionListView and AutoCollectionDocView so the boundary contract
   stays in one place. */ /* Resolves a Payload label/description into a single string for the active
   admin language. Handles the three native config forms:
   - `string` → as-is;
   - `LabelFunction` (`({ t }) => string`) → called with the request `t` (only
     when an `i18n` is supplied; a non-string return — e.g. an accidental React
     component — yields null, and the call is guarded so a throwing component
     can't crash extraction);
   - locale-keyed `Record<string,string>` → the active language, then
     `fallbackLanguage`, then the first string present. */ export const stringifyLabel = (value, i18n)=>{
    if (typeof value === 'string') return value;
    if (typeof value === 'function') {
        if (!i18n?.t) return null;
        try {
            const res = value({
                t: i18n.t,
                i18n
            });
            return typeof res === 'string' ? res : null;
        } catch  {
            return null;
        }
    }
    if (value && typeof value === 'object') {
        const obj = value;
        if (i18n?.language && typeof obj[i18n.language] === 'string') {
            return obj[i18n.language];
        }
        if (i18n?.fallbackLanguage && typeof obj[i18n.fallbackLanguage] === 'string') {
            return obj[i18n.fallbackLanguage];
        }
        for (const v of Object.values(obj)){
            if (typeof v === 'string') return v;
        }
    }
    return null;
};
const STRUCTURAL_WITH_CHILDREN = new Set([
    'row',
    'collapsible',
    'group',
    'array'
]);
const isStaticDefault = (v)=>{
    if (typeof v === 'function') return false;
    if (v === null || v === undefined) return true;
    const t = typeof v;
    return t === 'string' || t === 'number' || t === 'boolean' || Array.isArray(v) || t === 'object' && v.constructor === Object;
};
export const extractField = (raw, i18n)=>{
    const out = {
        type: raw.type,
        name: raw.name,
        label: stringifyLabel(raw.label, i18n),
        hideLabel: raw.label === false || raw.admin?.hideLabel === true || undefined,
        hidden: raw.hidden,
        required: raw.required,
        hasMany: raw.hasMany,
        localized: raw.localized === true ? true : undefined,
        relationTo: raw.relationTo
    };
    if (Array.isArray(raw.options)) {
        out.options = raw.options.map((opt)=>typeof opt === 'string' ? opt : {
                value: opt.value,
                label: stringifyLabel(opt.label, i18n) ?? opt.value
            });
    }
    if (raw.labels) {
        out.labels = {
            singular: stringifyLabel(raw.labels.singular, i18n),
            plural: stringifyLabel(raw.labels.plural, i18n)
        };
    }
    if (raw.admin) {
        out.admin = {
            hidden: raw.admin.hidden,
            disabled: raw.admin.disabled,
            readOnly: raw.admin.readOnly,
            disableListColumn: raw.admin.disableListColumn,
            disableBulkEdit: raw.admin.disableBulkEdit,
            description: stringifyLabel(raw.admin.description, i18n) ?? undefined,
            date: raw.admin.date ? {
                displayFormat: raw.admin.date.displayFormat
            } : undefined,
            language: typeof raw.admin.language === 'string' ? raw.admin.language : undefined,
            position: raw.admin.position === 'sidebar' ? 'sidebar' : undefined
        };
    }
    // Carry ONLY the plugin's own namespace across the RSC→Client boundary.
    // A non-serializable value under a foreign namespace (another plugin's
    // function, a Date, a class instance) would throw at the boundary even
    // though the plugin never reads it. Consumers using the cell/input override
    // hook must still ensure any function values under our namespace come from a
    // 'use client' module so they serialize as client references.
    const pluginCustom = raw.custom?.['plugin-shadcn-admin'];
    if (pluginCustom !== undefined) {
        out.custom = {
            'plugin-shadcn-admin': pluginCustom
        };
    }
    // Only carry static defaultValue forward. Function defaults stay
    // server-side (the create POST will resolve them).
    if (raw.defaultValue !== undefined && isStaticDefault(raw.defaultValue)) {
        out.defaultValue = raw.defaultValue;
    }
    if (STRUCTURAL_WITH_CHILDREN.has(raw.type) && Array.isArray(raw.fields)) {
        out.fields = raw.fields.map((f)=>extractField(f, i18n));
        if (raw.type === 'collapsible') {
            out.collapsibleLabel = stringifyLabel(raw.label, i18n);
        }
    }
    if (raw.type === 'tabs' && Array.isArray(raw.tabs)) {
        out.tabs = raw.tabs.map((tab)=>({
                label: stringifyLabel(tab.label, i18n),
                name: typeof tab.name === 'string' ? tab.name : undefined,
                fields: Array.isArray(tab.fields) ? tab.fields.map((f)=>extractField(f, i18n)) : []
            }));
    }
    // richText note: we deliberately do NOT carry `editor`/`editorConfig` across
    // the RSC→Client boundary — those carry server-side functions that won't
    // serialize. The rendered <RichTextField/> element comes in via a separate
    // `richTextRendered` channel built from `serverProps.formState` and lifted
    // by `extractRichTextRenderedFields`. The bridge mounts each in a Form shim.
    if (raw.type === 'blocks' && Array.isArray(raw.blocks)) {
        out.blocks = raw.blocks.map((block)=>({
                slug: String(block.slug),
                labels: block.labels ? {
                    singular: stringifyLabel(block.labels.singular, i18n),
                    plural: stringifyLabel(block.labels.plural, i18n)
                } : undefined,
                fields: Array.isArray(block.fields) ? block.fields.map((f)=>extractField(f, i18n)) : []
            }));
    }
    return out;
};
const extractUploadConfig = (raw)=>{
    if (!raw) return false;
    // `upload: true` (a rare-but-valid shorthand) → empty config object.
    if (raw === true) return {};
    if (typeof raw !== 'object') return false;
    const out = {};
    if (Array.isArray(raw.mimeTypes)) {
        out.mimeTypes = raw.mimeTypes.filter((x)=>typeof x === 'string');
    }
    if (typeof raw.maxFileSize === 'number') out.maxFileSize = raw.maxFileSize;
    if (typeof raw.crop === 'boolean') out.crop = raw.crop;
    if (typeof raw.focalPoint === 'boolean') out.focalPoint = raw.focalPoint;
    if (typeof raw.staticDir === 'string') out.staticDir = raw.staticDir;
    if (Array.isArray(raw.imageSizes)) {
        out.imageSizes = raw.imageSizes.map((s)=>typeof s?.name === 'string' ? {
                name: s.name
            } : null).filter(Boolean);
    }
    return out;
};
const extractDraftsConfig = (raw)=>{
    if (!raw) return false;
    if (raw === true) return {};
    if (typeof raw !== 'object') return false;
    const out = {};
    if (raw.autosave === true) {
        out.autosave = {};
    } else if (raw.autosave && typeof raw.autosave === 'object') {
        const a = {};
        if (typeof raw.autosave.interval === 'number') a.interval = raw.autosave.interval;
        if (typeof raw.autosave.showSaveDraftButton === 'boolean') {
            a.showSaveDraftButton = raw.autosave.showSaveDraftButton;
        }
        out.autosave = a;
    } else if (raw.autosave === false) {
        out.autosave = false;
    }
    if (typeof raw.validate === 'boolean') out.validate = raw.validate;
    if (typeof raw.localizeStatus === 'boolean') out.localizeStatus = raw.localizeStatus;
    if (raw.schedulePublish === true) {
        out.schedulePublish = {};
    } else if (raw.schedulePublish && typeof raw.schedulePublish === 'object') {
        const s = {};
        if (typeof raw.schedulePublish.timeFormat === 'string') {
            s.timeFormat = raw.schedulePublish.timeFormat;
        }
        if (typeof raw.schedulePublish.timeIntervals === 'number') {
            s.timeIntervals = raw.schedulePublish.timeIntervals;
        }
        out.schedulePublish = s;
    }
    return out;
};
export const extractVersionsConfig = (raw)=>{
    if (!raw || typeof raw !== 'object') return undefined;
    const out = {};
    if (raw.drafts !== undefined) out.drafts = extractDraftsConfig(raw.drafts);
    if (typeof raw.maxPerDoc === 'number') out.maxPerDoc = raw.maxPerDoc;
    return out;
};
/* Per-collection-config × per-admin-language memo. `extractCollection` is
   pure over `(raw, i18n)` and Payload only mutates collection configs at
   boot, so a WeakMap keyed on the raw config reference is safe: GC'd
   alongside the config. The inner Map keys on the admin-side language code
   (or '__no-i18n__') so two render passes for the same collection but
   different active admin languages don't collide. RSC renders call this on
   every doc/list-view request — without the memo each render re-walks the
   full field tree. */ const EXTRACT_CACHE = new WeakMap();
export const extractCollection = (raw, i18n)=>{
    if (!raw || typeof raw !== 'object') {
        return doExtractCollection(raw, i18n);
    }
    const langKey = i18n?.language ?? '__no-i18n__';
    let perLang = EXTRACT_CACHE.get(raw);
    if (!perLang) {
        perLang = new Map();
        EXTRACT_CACHE.set(raw, perLang);
    }
    const hit = perLang.get(langKey);
    if (hit) return hit;
    const next = doExtractCollection(raw, i18n);
    perLang.set(langKey, next);
    return next;
};
const doExtractCollection = (raw, i18n)=>({
        slug: raw.slug,
        admin: raw.admin ? {
            useAsTitle: raw.admin.useAsTitle,
            defaultColumns: raw.admin.defaultColumns
        } : null,
        labels: raw.labels ? {
            singular: stringifyLabel(raw.labels.singular, i18n),
            plural: stringifyLabel(raw.labels.plural, i18n)
        } : undefined,
        fields: Array.isArray(raw.fields) ? raw.fields.map((f)=>extractField(f, i18n)) : [],
        auth: Boolean(raw.auth),
        upload: extractUploadConfig(raw.upload),
        versions: extractVersionsConfig(raw.versions)
    });

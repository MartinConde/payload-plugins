export type ExtractedFieldOption = string | {
    value: string;
    label: string;
};
export type ExtractedTab = {
    label?: string | null;
    /** Named tabs nest values under this name (data[name].subfield).
     *  Unnamed tabs flatten their subfields into the doc root. */
    name?: string;
    fields: ExtractedField[];
};
export type ExtractedBlock = {
    slug: string;
    labels?: {
        singular?: string | null;
        plural?: string | null;
    };
    fields: ExtractedField[];
};
export type ExtractedField = {
    type: string;
    name?: string;
    label?: string | null;
    /** Set when the field config has `label: false` or `admin.hideLabel: true`.
     *  The renderer suppresses the field's heading entirely (no name fallback). */
    hideLabel?: boolean;
    hidden?: boolean;
    required?: boolean;
    hasMany?: boolean;
    /** v3.8: `localized: true` on a leaf field. The bridge holds locale-keyed
     *  values ({en, fr, …}) at every localized path and projects to the active
     *  locale at submit time. Carried through array/blocks/tabs/group/collapsible
     *  walks so nested localized leaves are flagged. */
    localized?: boolean;
    relationTo?: string | string[];
    options?: ExtractedFieldOption[];
    defaultValue?: unknown;
    labels?: {
        singular?: string | null;
        plural?: string | null;
    };
    admin?: {
        hidden?: boolean;
        /** Mirrors Payload's `admin.disabled` — the field is excluded from the
         *  admin UI entirely (data still managed via the API). Treated like
         *  `hidden` for rendering purposes. */
        disabled?: boolean;
        /** Mirrors Payload's `admin.readOnly` — the field renders but its inputs
         *  are disabled, and (for arrays/blocks) the add/remove/reorder controls
         *  are gated. Cascades to child inputs. */
        readOnly?: boolean;
        disableListColumn?: boolean;
        disableBulkEdit?: boolean;
        description?: string;
        date?: {
            displayFormat?: string;
        };
        language?: string;
        /** Mirrors Payload's `admin.position`. Only `'sidebar'` is meaningful —
         *  top-level fields carrying it render in the doc form's right-hand
         *  sidebar column instead of the main column. */
        position?: 'sidebar';
    } | null;
    custom?: Record<string, unknown>;
    fields?: ExtractedField[];
    collapsibleLabel?: string | null;
    tabs?: ExtractedTab[];
    blocks?: ExtractedBlock[];
};
/** Serializable subset of `collection.upload` carried RSC→Client. Only
 *  fields the dropzone / preview / EditUpload modal need at render time —
 *  no functions, no handlers, no hooks. */
export type ExtractedUploadConfig = {
    mimeTypes?: string[];
    /** bytes */
    maxFileSize?: number;
    crop?: boolean;
    focalPoint?: boolean;
    /** Informational; the wire shape uses /api/{slug} regardless. */
    staticDir?: string;
    /** Just the imageSize names, for an optional preview-size switcher. */
    imageSizes?: {
        name: string;
    }[];
};
/** Serializable subset of `collection.versions` carried RSC→Client. v3.6
 *  consumes this to toggle the drafts UI, autosave debounce, and the
 *  Save-draft button. `false` / undefined means versions are off. */
export type ExtractedDraftsConfig = false | {
    autosave?: false | {
        /** Debounce in ms; Payload's default is 800. */
        interval?: number;
        /** When false, hide the Save-draft button (autosave covers it). */
        showSaveDraftButton?: boolean;
    };
    validate?: boolean;
    /** v3.8: per-locale draft/publish status. When true AND localization is
     *  configured with multiple locales, DocStatusBar renders one pill per
     *  locale and the submit row gains a `[Publish all locales]` button. */
    localizeStatus?: boolean;
    /** Schedule-publish. Truthy mirrors Payload's `schedulePublish` drafts
     *  config — which is what registers the `schedulePublish` jobs task
     *  server-side. The bridge shows the schedule popover next to Publish
     *  only when this is present. `timeFormat` / `timeIntervals` mirror
     *  Payload's `SchedulePublish` type (time-picker hints). */
    schedulePublish?: false | {
        timeFormat?: string;
        timeIntervals?: number;
    };
};
export type ExtractedVersionsConfig = {
    drafts?: ExtractedDraftsConfig;
    /** Informational — the dialog hard-caps at 20 regardless. */
    maxPerDoc?: number;
};
export type ExtractedCollection = {
    slug: string;
    admin: {
        useAsTitle?: string;
        defaultColumns?: string[];
    } | null;
    labels?: {
        singular?: string | null;
        plural?: string | null;
    };
    fields: ExtractedField[];
    /** Auth collection flag — auth collections also accept a transient
     *  `password` field on create that isn't part of fields. The doc form
     *  synthesizes a password input from this flag. */
    auth?: boolean;
    /** Upload collection config — when present, the doc form renders a
     *  dropzone + preview above the field list and submits multipart on
     *  create / when the user picks a new file. `false` / undefined means
     *  not an upload collection. */
    upload?: false | ExtractedUploadConfig;
    /** Versions / drafts config — when drafts are on, the bridge swaps in
     *  the Save-draft / Publish button matrix, status bar, autosave loop,
     *  and Version history dialog. */
    versions?: ExtractedVersionsConfig;
};
export type ExtractI18n = {
    language?: string;
    fallbackLanguage?: string;
    t?: (...args: any[]) => string;
};
export declare const stringifyLabel: (value: unknown, i18n?: ExtractI18n) => string | null;
export declare const extractField: (raw: any, i18n?: ExtractI18n) => ExtractedField;
export declare const extractVersionsConfig: (raw: any) => ExtractedVersionsConfig | undefined;
export declare const extractCollection: (raw: any, i18n?: ExtractI18n) => ExtractedCollection;

/* Serializable subset of a Payload collection/field that survives RSC→Client.
   Strips functions (validators, hooks, label fns) but keeps the data both the
   auto-columns builder and the auto doc form need. Shared between
   AutoCollectionListView and AutoCollectionDocView so the boundary contract
   stays in one place. */

export type ExtractedFieldOption =
  | string
  | { value: string; label: string }

export type ExtractedTab = {
  label?: string | null
  /** Named tabs nest values under this name (data[name].subfield).
   *  Unnamed tabs flatten their subfields into the doc root. */
  name?: string
  fields: ExtractedField[]
}

export type ExtractedBlock = {
  slug: string
  labels?: { singular?: string | null; plural?: string | null }
  fields: ExtractedField[]
}

export type ExtractedField = {
  type: string
  name?: string
  label?: string | null
  /** Set when the field config has `label: false` or `admin.hideLabel: true`.
   *  The renderer suppresses the field's heading entirely (no name fallback). */
  hideLabel?: boolean
  hidden?: boolean
  required?: boolean
  hasMany?: boolean
  /** v3.8: `localized: true` on a leaf field. The bridge holds locale-keyed
   *  values ({en, fr, …}) at every localized path and projects to the active
   *  locale at submit time. Carried through array/blocks/tabs/group/collapsible
   *  walks so nested localized leaves are flagged. */
  localized?: boolean
  relationTo?: string | string[]
  options?: ExtractedFieldOption[]
  defaultValue?: unknown
  labels?: { singular?: string | null; plural?: string | null }
  admin?: {
    hidden?: boolean
    /** Mirrors Payload's `admin.disabled` — the field is excluded from the
     *  admin UI entirely (data still managed via the API). Treated like
     *  `hidden` for rendering purposes. */
    disabled?: boolean
    /** Mirrors Payload's `admin.readOnly` — the field renders but its inputs
     *  are disabled, and (for arrays/blocks) the add/remove/reorder controls
     *  are gated. Cascades to child inputs. */
    readOnly?: boolean
    disableListColumn?: boolean
    disableBulkEdit?: boolean
    description?: string
    date?: { displayFormat?: string }
    language?: string
    /** Mirrors Payload's `admin.position`. Only `'sidebar'` is meaningful —
     *  top-level fields carrying it render in the doc form's right-hand
     *  sidebar column instead of the main column. */
    position?: 'sidebar'
  } | null
  custom?: Record<string, unknown>
  // Populated for structural fields that carry direct children:
  //   row, collapsible, group, array.
  fields?: ExtractedField[]
  // For collapsible: the header label.
  collapsibleLabel?: string | null
  // For tabs: each tab's metadata + children.
  tabs?: ExtractedTab[]
  // For blocks: the per-block schemas.
  blocks?: ExtractedBlock[]
}

/** Serializable subset of `collection.upload` carried RSC→Client. Only
 *  fields the dropzone / preview / EditUpload modal need at render time —
 *  no functions, no handlers, no hooks. */
export type ExtractedUploadConfig = {
  mimeTypes?: string[]
  /** bytes */
  maxFileSize?: number
  crop?: boolean
  focalPoint?: boolean
  /** Informational; the wire shape uses /api/{slug} regardless. */
  staticDir?: string
  /** Just the imageSize names, for an optional preview-size switcher. */
  imageSizes?: { name: string }[]
}

/** Serializable subset of `collection.versions` carried RSC→Client. v3.6
 *  consumes this to toggle the drafts UI, autosave debounce, and the
 *  Save-draft button. `false` / undefined means versions are off. */
export type ExtractedDraftsConfig =
  | false
  | {
      autosave?:
        | false
        | {
            /** Debounce in ms; Payload's default is 800. */
            interval?: number
            /** When false, hide the Save-draft button (autosave covers it). */
            showSaveDraftButton?: boolean
          }
      validate?: boolean
      /** v3.8: per-locale draft/publish status. When true AND localization is
       *  configured with multiple locales, DocStatusBar renders one pill per
       *  locale and the submit row gains a `[Publish all locales]` button. */
      localizeStatus?: boolean
      /** Schedule-publish. Truthy mirrors Payload's `schedulePublish` drafts
       *  config — which is what registers the `schedulePublish` jobs task
       *  server-side. The bridge shows the schedule popover next to Publish
       *  only when this is present. `timeFormat` / `timeIntervals` mirror
       *  Payload's `SchedulePublish` type (time-picker hints). */
      schedulePublish?: false | { timeFormat?: string; timeIntervals?: number }
    }

export type ExtractedVersionsConfig = {
  drafts?: ExtractedDraftsConfig
  /** Informational — the dialog hard-caps at 20 regardless. */
  maxPerDoc?: number
}

export type ExtractedCollection = {
  slug: string
  admin: {
    useAsTitle?: string
    defaultColumns?: string[]
  } | null
  labels?: { singular?: string | null; plural?: string | null }
  fields: ExtractedField[]
  /** Auth collection flag — auth collections also accept a transient
   *  `password` field on create that isn't part of fields. The doc form
   *  synthesizes a password input from this flag. */
  auth?: boolean
  /** Upload collection config — when present, the doc form renders a
   *  dropzone + preview above the field list and submits multipart on
   *  create / when the user picks a new file. `false` / undefined means
   *  not an upload collection. */
  upload?: false | ExtractedUploadConfig
  /** Versions / drafts config — when drafts are on, the bridge swaps in
   *  the Save-draft / Publish button matrix, status bar, autosave loop,
   *  and Version history dialog. */
  versions?: ExtractedVersionsConfig
}

/* Minimal structural view of Payload's request `i18n` — just what label/
   description resolution needs. Kept structural (not importing Payload's `I18n`
   type) so this Node-loaded module stays import-light. Optional everywhere:
   absent → legacy behaviour (functions drop to null, locale objects collapse to
   their first string). */
export type ExtractI18n = {
  language?: string
  fallbackLanguage?: string
  // Loosely typed so Payload's `I18n` (whose `t` keys are a literal union) is
  // assignable here without contravariance friction.
  t?: (...args: any[]) => string
}

/* Resolves a Payload label/description into a single string for the active
   admin language. Handles the three native config forms:
   - `string` → as-is;
   - `LabelFunction` (`({ t }) => string`) → called with the request `t` (only
     when an `i18n` is supplied; a non-string return — e.g. an accidental React
     component — yields null, and the call is guarded so a throwing component
     can't crash extraction);
   - locale-keyed `Record<string,string>` → the active language, then
     `fallbackLanguage`, then the first string present. */
export const stringifyLabel = (
  value: unknown,
  i18n?: ExtractI18n,
): string | null => {
  if (typeof value === 'string') return value
  if (typeof value === 'function') {
    if (!i18n?.t) return null
    try {
      const res = (
        value as (args: { t: NonNullable<ExtractI18n['t']>; i18n: ExtractI18n }) => unknown
      )({ t: i18n.t, i18n })
      return typeof res === 'string' ? res : null
    } catch {
      return null
    }
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (i18n?.language && typeof obj[i18n.language] === 'string') {
      return obj[i18n.language] as string
    }
    if (i18n?.fallbackLanguage && typeof obj[i18n.fallbackLanguage] === 'string') {
      return obj[i18n.fallbackLanguage] as string
    }
    for (const v of Object.values(obj)) {
      if (typeof v === 'string') return v
    }
  }
  return null
}

const STRUCTURAL_WITH_CHILDREN = new Set(['row', 'collapsible', 'group', 'array'])

const isStaticDefault = (v: unknown): boolean => {
  if (typeof v === 'function') return false
  if (v === null || v === undefined) return true
  const t = typeof v
  return (
    t === 'string' ||
    t === 'number' ||
    t === 'boolean' ||
    Array.isArray(v) ||
    (t === 'object' && v.constructor === Object)
  )
}

export const extractField = (raw: any, i18n?: ExtractI18n): ExtractedField => {
  const out: ExtractedField = {
    type: raw.type,
    name: raw.name,
    label: stringifyLabel(raw.label, i18n),
    hideLabel: raw.label === false || raw.admin?.hideLabel === true || undefined,
    hidden: raw.hidden,
    required: raw.required,
    hasMany: raw.hasMany,
    localized: raw.localized === true ? true : undefined,
    relationTo: raw.relationTo,
  }
  if (Array.isArray(raw.options)) {
    out.options = raw.options.map((opt: any) =>
      typeof opt === 'string'
        ? opt
        : { value: opt.value, label: stringifyLabel(opt.label, i18n) ?? opt.value },
    )
  }
  if (raw.labels) {
    out.labels = {
      singular: stringifyLabel(raw.labels.singular, i18n),
      plural: stringifyLabel(raw.labels.plural, i18n),
    }
  }
  if (raw.admin) {
    out.admin = {
      hidden: raw.admin.hidden,
      disabled: raw.admin.disabled,
      readOnly: raw.admin.readOnly,
      disableListColumn: raw.admin.disableListColumn,
      disableBulkEdit: raw.admin.disableBulkEdit,
      description: stringifyLabel(raw.admin.description, i18n) ?? undefined,
      date: raw.admin.date
        ? { displayFormat: raw.admin.date.displayFormat }
        : undefined,
      language:
        typeof raw.admin.language === 'string' ? raw.admin.language : undefined,
      position: raw.admin.position === 'sidebar' ? 'sidebar' : undefined,
    }
  }
  // Carry ONLY the plugin's own namespace across the RSC→Client boundary.
  // A non-serializable value under a foreign namespace (another plugin's
  // function, a Date, a class instance) would throw at the boundary even
  // though the plugin never reads it. Consumers using the cell/input override
  // hook must still ensure any function values under our namespace come from a
  // 'use client' module so they serialize as client references.
  const pluginCustom = raw.custom?.['plugin-shadcn-admin']
  if (pluginCustom !== undefined) {
    out.custom = { 'plugin-shadcn-admin': pluginCustom }
  }
  // Only carry static defaultValue forward. Function defaults stay
  // server-side (the create POST will resolve them).
  if (raw.defaultValue !== undefined && isStaticDefault(raw.defaultValue)) {
    out.defaultValue = raw.defaultValue
  }
  if (STRUCTURAL_WITH_CHILDREN.has(raw.type) && Array.isArray(raw.fields)) {
    out.fields = raw.fields.map((f: any) => extractField(f, i18n))
    if (raw.type === 'collapsible') {
      out.collapsibleLabel = stringifyLabel(raw.label, i18n)
    }
  }
  if (raw.type === 'tabs' && Array.isArray(raw.tabs)) {
    out.tabs = raw.tabs.map((tab: any) => ({
      label: stringifyLabel(tab.label, i18n),
      name: typeof tab.name === 'string' ? tab.name : undefined,
      fields: Array.isArray(tab.fields)
        ? tab.fields.map((f: any) => extractField(f, i18n))
        : [],
    }))
  }
  // richText note: we deliberately do NOT carry `editor`/`editorConfig` across
  // the RSC→Client boundary — those carry server-side functions that won't
  // serialize. The rendered <RichTextField/> element comes in via a separate
  // `richTextRendered` channel built from `serverProps.formState` and lifted
  // by `extractRichTextRenderedFields`. The bridge mounts each in a Form shim.
  if (raw.type === 'blocks' && Array.isArray(raw.blocks)) {
    out.blocks = raw.blocks.map((block: any) => ({
      slug: String(block.slug),
      labels: block.labels
        ? {
            singular: stringifyLabel(block.labels.singular, i18n),
            plural: stringifyLabel(block.labels.plural, i18n),
          }
        : undefined,
      fields: Array.isArray(block.fields)
        ? block.fields.map((f: any) => extractField(f, i18n))
        : [],
    }))
  }
  return out
}

const extractUploadConfig = (raw: any): false | ExtractedUploadConfig => {
  if (!raw) return false
  // `upload: true` (a rare-but-valid shorthand) → empty config object.
  if (raw === true) return {}
  if (typeof raw !== 'object') return false
  const out: ExtractedUploadConfig = {}
  if (Array.isArray(raw.mimeTypes)) {
    out.mimeTypes = raw.mimeTypes.filter((x: unknown) => typeof x === 'string')
  }
  if (typeof raw.maxFileSize === 'number') out.maxFileSize = raw.maxFileSize
  if (typeof raw.crop === 'boolean') out.crop = raw.crop
  if (typeof raw.focalPoint === 'boolean') out.focalPoint = raw.focalPoint
  if (typeof raw.staticDir === 'string') out.staticDir = raw.staticDir
  if (Array.isArray(raw.imageSizes)) {
    out.imageSizes = raw.imageSizes
      .map((s: any) => (typeof s?.name === 'string' ? { name: s.name } : null))
      .filter(Boolean) as { name: string }[]
  }
  return out
}

const extractDraftsConfig = (raw: any): ExtractedDraftsConfig => {
  if (!raw) return false
  if (raw === true) return {}
  if (typeof raw !== 'object') return false
  const out: Exclude<ExtractedDraftsConfig, false> = {}
  if (raw.autosave === true) {
    out.autosave = {}
  } else if (raw.autosave && typeof raw.autosave === 'object') {
    const a: Exclude<Exclude<ExtractedDraftsConfig, false>['autosave'], false | undefined> = {}
    if (typeof raw.autosave.interval === 'number') a.interval = raw.autosave.interval
    if (typeof raw.autosave.showSaveDraftButton === 'boolean') {
      a.showSaveDraftButton = raw.autosave.showSaveDraftButton
    }
    out.autosave = a
  } else if (raw.autosave === false) {
    out.autosave = false
  }
  if (typeof raw.validate === 'boolean') out.validate = raw.validate
  if (typeof raw.localizeStatus === 'boolean') out.localizeStatus = raw.localizeStatus
  if (raw.schedulePublish === true) {
    out.schedulePublish = {}
  } else if (raw.schedulePublish && typeof raw.schedulePublish === 'object') {
    const s: Exclude<
      Exclude<ExtractedDraftsConfig, false>['schedulePublish'],
      false | undefined
    > = {}
    if (typeof raw.schedulePublish.timeFormat === 'string') {
      s.timeFormat = raw.schedulePublish.timeFormat
    }
    if (typeof raw.schedulePublish.timeIntervals === 'number') {
      s.timeIntervals = raw.schedulePublish.timeIntervals
    }
    out.schedulePublish = s
  }
  return out
}

export const extractVersionsConfig = (raw: any): ExtractedVersionsConfig | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const out: ExtractedVersionsConfig = {}
  if (raw.drafts !== undefined) out.drafts = extractDraftsConfig(raw.drafts)
  if (typeof raw.maxPerDoc === 'number') out.maxPerDoc = raw.maxPerDoc
  return out
}

/* Per-collection-config × per-admin-language memo. `extractCollection` is
   pure over `(raw, i18n)` and Payload only mutates collection configs at
   boot, so a WeakMap keyed on the raw config reference is safe: GC'd
   alongside the config. The inner Map keys on the admin-side language code
   (or '__no-i18n__') so two render passes for the same collection but
   different active admin languages don't collide. RSC renders call this on
   every doc/list-view request — without the memo each render re-walks the
   full field tree. */
const EXTRACT_CACHE: WeakMap<object, Map<string, ExtractedCollection>> =
  new WeakMap()

export const extractCollection = (
  raw: any,
  i18n?: ExtractI18n,
): ExtractedCollection => {
  if (!raw || typeof raw !== 'object') {
    return doExtractCollection(raw, i18n)
  }
  const langKey = i18n?.language ?? '__no-i18n__'
  let perLang = EXTRACT_CACHE.get(raw)
  if (!perLang) {
    perLang = new Map()
    EXTRACT_CACHE.set(raw, perLang)
  }
  const hit = perLang.get(langKey)
  if (hit) return hit
  const next = doExtractCollection(raw, i18n)
  perLang.set(langKey, next)
  return next
}

const doExtractCollection = (
  raw: any,
  i18n?: ExtractI18n,
): ExtractedCollection => ({
  slug: raw.slug,
  admin: raw.admin
    ? {
        useAsTitle: raw.admin.useAsTitle,
        defaultColumns: raw.admin.defaultColumns,
      }
    : null,
  labels: raw.labels
    ? {
        singular: stringifyLabel(raw.labels.singular, i18n),
        plural: stringifyLabel(raw.labels.plural, i18n),
      }
    : undefined,
  fields: Array.isArray(raw.fields)
    ? raw.fields.map((f: any) => extractField(f, i18n))
    : [],
  auth: Boolean(raw.auth),
  upload: extractUploadConfig(raw.upload),
  versions: extractVersionsConfig(raw.versions),
})

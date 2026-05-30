/* Public-facing types for `.input` field-component overrides. Mirrors the
   shape passed by the admin plugin's FieldTreeRenderer at runtime, but loose
   enough that consumer plugins (menus/products/seo) can author overrides
   without taking a runtime dep on the admin plugin. */

import type {
  ExtractedBlock,
  ExtractedCollection,
  ExtractedField,
  ExtractedTab,
} from './extractCollection.js'

export type FieldInputOption =
  | string
  | { value: string; label: string }

export type FieldInputField = {
  type: string
  name: string
  label?: string | null
  hidden?: boolean
  hasMany?: boolean
  relationTo?: string | string[]
  options?: FieldInputOption[]
  admin?: {
    hidden?: boolean
    disableBulkEdit?: boolean
    description?: string
    date?: { displayFormat?: string }
    language?: string
  } | null
  custom?: Record<string, unknown>
  fields?: ExtractedField[]
  blocks?: ExtractedBlock[]
  tabs?: ExtractedTab[]
}

/** Translation function signature used by overrides that need i18n.
 *  Matches @payloadcms/translations TFunction loosely without taking a peer
 *  dep on the package from the override author's side. */
export type FieldInputTFunction = (key: string, args?: unknown) => string

export type FieldInputProps = {
  field: FieldInputField
  value: unknown
  useAsTitleBySlug: Record<string, string | undefined>
  /** Serializable metadata for every upload collection, keyed by slug. Only
   *  upload fields consume it (for the custom UploadNewDialog); defaults to `{}`
   *  so non-upload callers (bulk-edit, auth) need not supply it. */
  uploadCollectionsBySlug?: Record<string, ExtractedCollection>
  onChange: (value: unknown) => void
  id?: string
  required?: boolean
  invalid?: boolean
  disabled?: boolean
  nestedPath?: string
  renderChild?: (
    child: ExtractedField,
    pathPrefix: string,
    parentPerms?: unknown,
  ) => React.ReactNode
  /** Pre-rendered Payload Field element + initial value for richText fields
   *  (bridge-internal; overrides never construct it). Typed as `unknown` here
   *  so the public surface doesn't leak the bridge's internal richtext shape. */
  richTextRendered?: unknown
  operation?: 'create' | 'update'
  /** Active locale code (null when localization is off). */
  activeLocale?: string | null
  /** Bridge field permissions for the rendered field; loose `unknown` so
   *  overrides can pass through to nested renderers without typing the
   *  internal access-control tree. */
  fieldPerms?: unknown
  /** Active i18n `t` (from @payloadcms/translations) for overrides that need
   *  to call it directly. */
  t?: FieldInputTFunction
}

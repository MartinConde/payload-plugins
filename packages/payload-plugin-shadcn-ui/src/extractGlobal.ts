/* Serializable subset of a Payload GLOBAL that survives RSC→Client. A global
   is just a fields array + optional versions/drafts/localization, so it reuses
   the collection field-extraction machinery wholesale and projects into the
   same `ExtractedCollection` shape the doc-form bridge already consumes. The
   singleton-specific differences (no list view, no create mode, no doc ID) live
   at the RSC entry + submit-wire layers, not here.

   Mapping notes:
   - globals carry a single `label` (string or i18n object) instead of
     `labels.{singular,plural}` → mapped to `labels.singular`;
   - globals have no `useAsTitle`, no `auth`, and are never upload entities →
     `admin: null` (no useAsTitle), `auth: false`, `upload: false`. */

import {
  extractField,
  extractVersionsConfig,
  stringifyLabel,
  type ExtractedCollection,
  type ExtractI18n,
} from './extractCollection.js'

export const extractGlobal = (
  raw: any,
  i18n?: ExtractI18n,
): ExtractedCollection => ({
  slug: raw.slug,
  // Globals have no `useAsTitle`/`defaultColumns`; null keeps the bridge's
  // `collection.admin?.useAsTitle` lookups returning undefined.
  admin: null,
  labels: { singular: stringifyLabel(raw.label, i18n), plural: null },
  fields: Array.isArray(raw.fields)
    ? raw.fields.map((f: any) => extractField(f, i18n))
    : [],
  auth: false,
  upload: false,
  versions: extractVersionsConfig(raw.versions),
})

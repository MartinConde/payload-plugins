/* Lift Payload's pre-rendered richText Field elements out of serverProps.formState.

   Payload's DocumentView pipeline runs `renderField` for every field at server-
   render time. For richText fields, this stores `<RichTextField {...heavyProps}/>`
   (wrapped in WatchCondition) at `formState[path].customComponents.Field`. The
   heavyProps include `clientFeatures`, `featureClientImportMap`,
   `featureClientSchemaMap`, `initialLexicalFormState`, `lexicalEditorConfig` —
   the full Lexical RSC computation, already done.

   We walk the extracted schema PLUS the runtime data to enumerate every
   richText leaf path that exists in this document, then look up the rendered
   element in formState. The schema walk mirrors AutoDocFormBridge's path
   composition so the keys align exactly. */

import type {
  ExtractedCollection,
  ExtractedField,
} from 'payload-plugin-shadcn-ui'

export type RichTextRenderedEntry = {
  /** Pre-built <RichTextField/> element with all heavy props baked in.
   *  Renderable verbatim inside the Form shim. */
  Field: unknown
  /** Initial SerializedEditorState value at this path. */
  initialValue: unknown
}

export type RichTextRenderedMap = Record<string, RichTextRenderedEntry>

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function* walkRichTextPaths(
  fields: ExtractedField[],
  data: unknown,
  prefix: string,
): Iterable<string> {
  for (const f of fields) {
    if (f.type === 'row' || f.type === 'collapsible') {
      if (f.fields) yield* walkRichTextPaths(f.fields, data, prefix)
      continue
    }
    if (f.type === 'group') {
      if (!f.name || !f.fields) continue
      const sub = isObject(data) ? data[f.name] : undefined
      yield* walkRichTextPaths(f.fields, sub, `${prefix}${f.name}.`)
      continue
    }
    if (f.type === 'tabs') {
      for (const tab of f.tabs ?? []) {
        if (tab.name) {
          const sub = isObject(data) ? data[tab.name] : undefined
          yield* walkRichTextPaths(tab.fields, sub, `${prefix}${tab.name}.`)
        } else {
          // Unnamed tab: subfields flatten into the parent.
          yield* walkRichTextPaths(tab.fields, data, prefix)
        }
      }
      continue
    }
    if (f.type === 'array') {
      if (!f.name || !f.fields) continue
      const rows = isObject(data) ? data[f.name] : undefined
      if (Array.isArray(rows)) {
        for (let idx = 0; idx < rows.length; idx++) {
          yield* walkRichTextPaths(
            f.fields,
            rows[idx],
            `${prefix}${f.name}.${idx}.`,
          )
        }
      }
      continue
    }
    if (f.type === 'blocks') {
      if (!f.name || !f.blocks) continue
      const rows = isObject(data) ? data[f.name] : undefined
      if (Array.isArray(rows)) {
        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx]
          if (!isObject(row)) continue
          const blockType =
            typeof row.blockType === 'string' ? row.blockType : undefined
          const block = f.blocks.find((b) => b.slug === blockType)
          if (!block) continue
          yield* walkRichTextPaths(
            block.fields,
            row,
            `${prefix}${f.name}.${idx}.`,
          )
        }
      }
      continue
    }
    if (f.type === 'richText') {
      if (!f.name) continue
      yield `${prefix}${f.name}`
    }
  }
}

const getByPath = (root: unknown, path: string): unknown => {
  if (path === '') return root
  let cur: unknown = root
  for (const seg of path.split('.')) {
    if (cur === null || cur === undefined) return undefined
    const idx = Number(seg)
    if (Number.isInteger(idx) && String(idx) === seg) {
      if (!Array.isArray(cur)) return undefined
      cur = (cur as unknown[])[idx]
    } else {
      if (!isObject(cur)) return undefined
      cur = cur[seg]
    }
  }
  return cur
}

/* Build the richText path → rendered-entry map from the extracted schema, the
   runtime doc data, and Payload's pre-built formState. */
export function extractRichTextRenderedFields(
  collection: ExtractedCollection,
  data: unknown,
  formState: Record<string, { customComponents?: { Field?: unknown }; value?: unknown }> | undefined,
): RichTextRenderedMap {
  if (!formState) return {}
  const out: RichTextRenderedMap = {}
  for (const path of walkRichTextPaths(collection.fields, data, '')) {
    const entry = formState[path]
    const Field = entry?.customComponents?.Field
    if (Field === undefined || Field === null) continue
    out[path] = {
      Field,
      initialValue: getByPath(data, path),
    }
  }
  return out
}

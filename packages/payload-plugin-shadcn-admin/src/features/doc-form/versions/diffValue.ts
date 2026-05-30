/* Value → display-string helpers for the version diff. Every leaf field type
   is reduced to a plain string for both sides, then fed through
   `getHTMLDiffComponents` for uniform From→To highlighting. Server-safe (no
   React, no DOM). v3.9.

   richText is serialized to plain text (Lexical root walk) — this is a known
   fidelity trade vs Payload's dedicated richText differ; see FEATURES.md. */

import type { ExtractedField, ExtractedFieldOption } from 'payload-plugin-shadcn-ui'

/** Escape a plain string so `getHTMLDiffComponents` (which diffs HTML) treats
 *  it as literal text rather than markup. */
export const escapeForDiff = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const optionLabel = (
  options: ExtractedFieldOption[] | undefined,
  value: unknown,
): string => {
  const v = String(value)
  const match = options?.find((o) =>
    typeof o === 'string' ? o === v : o.value === v,
  )
  if (!match) return v
  return typeof match === 'string' ? match : match.label
}

/** Pull a human title out of a populated relationship/upload value. Falls back
 *  to the id (or the raw value) when nothing better is available. */
const relationshipTitle = (value: unknown): string => {
  if (value == null) return ''
  // Polymorphic shape: { relationTo, value }
  if (
    typeof value === 'object' &&
    'value' in (value as Record<string, unknown>) &&
    'relationTo' in (value as Record<string, unknown>)
  ) {
    const inner = (value as { value: unknown }).value
    return relationshipTitle(inner)
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    for (const key of ['title', 'name', 'filename', 'email', 'slug']) {
      if (typeof o[key] === 'string' && o[key]) return o[key] as string
    }
    if (o.id != null) return String(o.id)
    return ''
  }
  return String(value)
}

/* ── richText structural diff (v3.24) ──────────────────────────────────────
   Rather than flatten Lexical to one plain-text blob (which loses block
   structure and inline formatting), serialize each side to HTML and let
   `getHTMLDiffComponents` — Payload's own HTML differ, already used for every
   leaf — surface block-level (paragraph↔heading, list changes), inline-format
   (bold/italic/link added), AND text changes granularly. This is the bounded
   alternative to a full custom Lexical tree-diff: we reuse the HTML differ
   instead of aligning nodes ourselves. Covers the common core nodes; unknown
   nodes degrade to their text content (or a typed placeholder for void nodes
   like uploads/blocks), so an unrecognized node never breaks the diff. */

// Lexical text-format bitmask → wrapping tags (innermost-last).
const FORMAT_TAGS: Array<[number, string]> = [
  [1, 'strong'], // bold
  [2, 'em'], // italic
  [4, 's'], // strikethrough
  [8, 'u'], // underline
  [16, 'code'], // inline code
  [32, 'sub'], // subscript
  [64, 'sup'], // superscript
]

const wrapFormat = (text: string, format: number): string => {
  let out = text
  for (const [bit, tag] of FORMAT_TAGS) {
    if ((format & bit) === bit) out = `<${tag}>${out}</${tag}>`
  }
  return out
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const lexicalNodeToHTML = (node: any): string => {
  if (!node || typeof node !== 'object') return ''

  // Text leaf.
  if (typeof node.text === 'string') {
    return wrapFormat(escapeForDiff(node.text), Number(node.format) || 0)
  }
  if (node.type === 'linebreak') return '<br />'

  const childrenHTML = Array.isArray(node.children)
    ? node.children.map(lexicalNodeToHTML).join('')
    : ''

  switch (node.type) {
    case 'paragraph':
      return `<p>${childrenHTML}</p>`
    case 'heading': {
      const tag = HEADING_TAGS.has(node.tag) ? node.tag : 'h2'
      return `<${tag}>${childrenHTML}</${tag}>`
    }
    case 'quote':
      return `<blockquote>${childrenHTML}</blockquote>`
    case 'list': {
      const tag = node.tag === 'ol' || node.listType === 'number' ? 'ol' : 'ul'
      return `<${tag}>${childrenHTML}</${tag}>`
    }
    case 'listitem':
      return `<li>${childrenHTML}</li>`
    case 'link':
    case 'autolink': {
      const url =
        typeof node.fields?.url === 'string' ? node.fields.url : undefined
      return url
        ? `<a href="${escapeForDiff(url)}">${childrenHTML}</a>`
        : childrenHTML
    }
    case 'horizontalrule':
      return '<hr />'
    // Void / embedded nodes: a typed placeholder so add/remove/change shows,
    // without trying to render their (arbitrary) payload.
    case 'upload':
      return `<p>[upload: ${escapeForDiff(
        String(node.value?.filename ?? node.value?.id ?? node.relationTo ?? ''),
      )}]</p>`
    case 'relationship':
      return `<p>[relationship: ${escapeForDiff(
        String(node.value?.id ?? node.relationTo ?? ''),
      )}]</p>`
    case 'block':
      return `<p>[block: ${escapeForDiff(
        String(node.fields?.blockType ?? ''),
      )}]</p>`
    default:
      // Unknown container → render its children; unknown leaf → nothing.
      return childrenHTML
  }
}

/** HTML serialization of a Lexical richText value for the structural diff.
 *  Text content is escaped; structural/format tags are literal. */
export const richTextToDiffHTML = (value: unknown): string => {
  const root = (value as { root?: { children?: unknown[] } } | null)?.root
  if (!root || !Array.isArray(root.children)) {
    return value == null ? '' : escapeForDiff(JSON.stringify(value))
  }
  return root.children.map(lexicalNodeToHTML).join('')
}

/** Plain-text serialization of a Lexical richText value. */
const lexicalToText = (value: unknown): string => {
  const root = (value as { root?: { children?: unknown[] } } | null)?.root
  if (!root || !Array.isArray(root.children)) {
    return value == null ? '' : JSON.stringify(value)
  }
  const parts: string[] = []
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return
    if (typeof node.text === 'string') parts.push(node.text)
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child)
      // Block-level nodes get a newline so paragraphs read as separate lines.
      if (['paragraph', 'heading', 'listitem', 'quote'].includes(node.type)) {
        parts.push('\n')
      }
    }
  }
  for (const child of root.children) walk(child)
  return parts.join('').replace(/\n+$/g, '').trim()
}

/** Reduce a leaf field value (already projected to a single locale) to a
 *  display string. Used for both From and To sides of the diff. */
export const stringifyDiffValue = (
  field: ExtractedField,
  value: unknown,
): string => {
  if (value === undefined || value === null) return ''

  switch (field.type) {
    case 'checkbox':
      return value ? 'true' : 'false'

    case 'date': {
      const d = new Date(String(value))
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
    }

    case 'select':
    case 'radio':
      return Array.isArray(value)
        ? value.map((v) => optionLabel(field.options, v)).join(', ')
        : optionLabel(field.options, value)

    case 'relationship':
    case 'upload':
      return Array.isArray(value)
        ? value.map(relationshipTitle).filter(Boolean).join(', ')
        : relationshipTitle(value)

    case 'point':
      return Array.isArray(value) ? `[${value.join(', ')}]` : String(value)

    case 'json':
      return typeof value === 'string'
        ? value
        : JSON.stringify(value, null, 2)

    case 'richText':
      return lexicalToText(value)

    case 'number':
    case 'text':
    case 'textarea':
    case 'email':
    case 'code':
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
}

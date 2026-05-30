/* Flatten a collection's field tree into the list of fields the bulk-edit
   picker can offer. Structural containers (row/collapsible/group/tabs) are
   transparent — we recurse into them and offer their inner leaves, each at its
   full dotted path so the PATCH body can nest them (e.g. `myGroup.subfield`).
   array / blocks / richText are offered as a single whole-value entry (no
   recursion). Everything the doc form supports is offered; the only skips are
   the doc-form renderability rules plus the `admin.disableBulkEdit` opt-out. */

import type {
  ExtractedField,
  ExtractedTab,
} from 'payload-plugin-shadcn-ui'
import {
  isFieldRenderable,
  labelOf,
} from '../../doc-form/fieldTree/sharedHelpers.js'

export type PickableField = {
  /** Full dotted path, e.g. `title`, `myGroup.subfield`, `myTab.items`. */
  path: string
  /** Path prefix to hand renderField (everything before `field.name`). */
  pathPrefix: string
  field: ExtractedField
  /** Breadcrumb label, e.g. `Group › Subfield`. */
  label: string
  type: string
}

const tabLabelOf = (tab: ExtractedTab, idx: number): string => {
  if (tab.label && tab.label.length > 0) return tab.label
  if (tab.name && tab.name.length > 0) return tab.name
  return `Tab ${idx + 1}`
}

const crumb = (parent: string, child: string): string =>
  parent ? `${parent} › ${child}` : child

const isPickableLeaf = (field: ExtractedField): boolean => {
  if (!field.name) return false
  if (field.admin?.disableBulkEdit) return false
  return isFieldRenderable(field)
}

/* Walk one level. `pathPrefix` already includes a trailing dot when non-empty
   (e.g. `myGroup.`). `labelPrefix` is the breadcrumb accumulated from enclosing
   named containers. */
const walk = (
  fields: ExtractedField[],
  pathPrefix: string,
  labelPrefix: string,
  out: PickableField[],
): void => {
  for (const field of fields) {
    if (field.type === 'row' || field.type === 'collapsible') {
      // Transparent: same path prefix, breadcrumb unchanged (these have no
      // data path of their own).
      walk(field.fields ?? [], pathPrefix, labelPrefix, out)
      continue
    }
    if (field.type === 'group') {
      if (!field.name) continue
      walk(
        field.fields ?? [],
        `${pathPrefix}${field.name}.`,
        crumb(labelPrefix, labelOf(field)),
        out,
      )
      continue
    }
    if (field.type === 'tabs') {
      ;(field.tabs ?? []).forEach((tab, idx) => {
        const tabPrefix = tab.name ? `${pathPrefix}${tab.name}.` : pathPrefix
        walk(tab.fields, tabPrefix, crumb(labelPrefix, tabLabelOf(tab, idx)), out)
      })
      continue
    }
    // Leaf (incl. array / blocks / richText — offered as whole-value entries).
    if (!isPickableLeaf(field)) continue
    out.push({
      path: `${pathPrefix}${field.name}`,
      pathPrefix,
      field,
      label: crumb(labelPrefix, labelOf(field)),
      type: field.type,
    })
  }
}

export const collectBulkEditableLeaves = (
  fields: ExtractedField[],
): PickableField[] => {
  const out: PickableField[] = []
  walk(fields, '', '', out)
  return out
}

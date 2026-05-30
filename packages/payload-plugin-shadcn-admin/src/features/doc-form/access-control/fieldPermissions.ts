/* Helpers for the v3.7 access-control-driven field hiding. Operates on the
   sanitized field-permissions tree Payload exposes via
   `useDocumentInfo().docPermissions` (`SanitizedDocumentPermissions`).

   ## The sanitized shape (important)

   `payload/dist/utilities/sanitizePermissions.js` is destructive: it
   COLLAPSES the permission tree to minimize wire size, with rules that
   make naive `obj.field.op === true` checks return the WRONG answer:

   - A permission `{ permission: true }` with no `where` → replaced with
     literal `true`.
   - A permission `{ permission: false }` → the KEY IS DELETED.
   - When ALL ops on a field are `true`, the field's whole entry collapses
     to literal `true`.
   - When EVERY field in a `.fields` map collapses to `true`, the `.fields`
     map itself collapses to literal `true`.
   - Same rules apply recursively for nested groups, arrays, blocks.

   Concretely, for `{ name: 'adminNotes', access: { update: () => false } }`:
   - `update` evaluates to `{ permission: false }` → deleted.
   - `read` and `create` stay `true`.
   - The field entry becomes `{ read: true, create: true }` (no `update`).

   ## Reading these helpers

   "Field key absent from a known `.fields` map" means **denied for every
   op** (the sanitizer deleted the entry). "Op key absent from a known
   field entry" means **that op was denied**. "Field/op key present as
   `true`" means allowed. "Field entry is `true`" (collapsed) means all
   ops allowed. "Parent `.fields` is `true`" means every child fully
   allowed. Absence of the parent's `.fields` map entirely (or undefined
   perms) means "we don't have permission context" → default allow (the
   server is always authoritative; the UI's only job here is to hide
   things we KNOW are denied). */

import type { ExtractedField } from 'payload-plugin-shadcn-ui'

export type Perms = unknown

type FieldOp = 'read' | 'update' | 'create'

/** Internal: gate one operation on one named child of `parent`. */
const canDo = (parent: Perms, fieldName: string, op: FieldOp): boolean => {
  // No perms context — default allow. Loading state or no docPermissions
  // populated; the server enforces authoritatively in either case.
  if (parent === undefined || parent === null) return true
  if (typeof parent !== 'object') {
    // `parent === true` (collapsed: fully allowed) lands here.
    return true
  }
  const fields = (parent as { fields?: unknown }).fields
  if (fields === undefined) {
    // Parent has no fields map at this level — default allow.
    return true
  }
  if (fields === true) {
    // All children fully allowed (sanitizer collapsed).
    return true
  }
  if (typeof fields !== 'object') return true
  const fp = (fields as Record<string, unknown>)[fieldName]
  if (fp === undefined) {
    // Entry deleted from sanitized output → fully denied.
    return false
  }
  if (fp === true) {
    // Fully allowed (collapsed).
    return true
  }
  if (typeof fp !== 'object' || fp === null) return false
  const opVal = (fp as Record<string, unknown>)[op]
  if (opVal === undefined) {
    // Op key absent → that op was denied for this field.
    return false
  }
  if (opVal === true) return true
  if (
    typeof opVal === 'object' &&
    opVal !== null &&
    'permission' in (opVal as Record<string, unknown>)
  ) {
    return Boolean((opVal as { permission: unknown }).permission)
  }
  return false
}

/** Whether the current user can READ this child. Used to gate render. */
export const canRead = (parent: Perms, fieldName: string): boolean =>
  canDo(parent, fieldName, 'read')

/** Whether the current user can UPDATE this child. Used to gate input
 *  disabled state. */
export const canUpdate = (parent: Perms, fieldName: string): boolean =>
  canDo(parent, fieldName, 'update')

/** Whether the current user can CREATE this child. Used in create-mode forms
 *  to gate input disabled state (v3.18). Payload runs `access.create` only on
 *  create operations and `access.update` only on update operations, so callers
 *  pick the op that matches the current form operation rather than checking
 *  both. */
export const canCreate = (parent: Perms, fieldName: string): boolean =>
  canDo(parent, fieldName, 'create')

/** Get the sub-perms for a named child container (group / array / blocks /
 *  named tab). Returns the FieldPermissions entry for that child — which
 *  may be `true` (fully allowed), a partial object, or undefined (denied or
 *  no context). Callers should NOT inspect the result directly; pass it as
 *  `parentPerms` to subsequent canRead/canUpdate/isFieldVisible calls. */
export const subPerms = (parent: Perms, fieldName: string): Perms => {
  if (parent === undefined || parent === null) return undefined
  if (typeof parent !== 'object') return parent // `true` propagates
  const fields = (parent as { fields?: unknown }).fields
  if (fields === undefined) return undefined
  if (fields === true) return true // propagate fully-allowed downward
  if (typeof fields !== 'object') return undefined
  return (fields as Record<string, unknown>)[fieldName]
}

/** Sub-perms for a specific block slug within a blocks field. */
export const subBlockPerms = (
  parent: Perms,
  fieldName: string,
  blockSlug: string,
): Perms => {
  const fp = subPerms(parent, fieldName)
  if (fp === undefined) return undefined
  if (fp === true) return true
  if (typeof fp !== 'object') return undefined
  const blocks = (fp as { blocks?: unknown }).blocks
  if (blocks === undefined) return undefined
  if (blocks === true) return true
  if (typeof blocks !== 'object') return undefined
  return (blocks as Record<string, unknown>)[blockSlug]
}

/** Recursive visibility check used to decide whether a structural container
 *  (row / collapsible / group / tabs) should render at all. Returns true if
 *  any leaf inside `field` is readable under `parentPerms`.
 *
 *  Synthesized fields (`__password`, `__confirmPassword`, etc.) are always
 *  considered visible — they're outside the schema's permission set. */
export const isFieldVisible = (
  field: ExtractedField,
  parentPerms: Perms,
): boolean => {
  if (field.name && field.name.startsWith('__')) return true

  // A `ui` field carrying our `.input` override is presentational (no data, not
  // in docPermissions) — always visible; FieldTreeRenderer renders it bare.
  if (
    field.type === 'ui' &&
    Boolean(
      (field.custom?.['plugin-shadcn-admin'] as { input?: unknown } | undefined)
        ?.input,
    )
  ) {
    return true
  }

  // Transparent structurals share their parent's perms map.
  if (field.type === 'row' || field.type === 'collapsible') {
    return (field.fields ?? []).some((c) => isFieldVisible(c, parentPerms))
  }

  if (field.type === 'tabs') {
    return (field.tabs ?? []).some((tab) => {
      // Named tab is itself a permissions node — if read-denied, hide tab.
      if (tab.name && !canRead(parentPerms, tab.name)) return false
      const tabPerms = tab.name ? subPerms(parentPerms, tab.name) : parentPerms
      return tab.fields.some((c) => isFieldVisible(c, tabPerms))
    })
  }

  if (!field.name) return false
  if (!canRead(parentPerms, field.name)) return false

  if (field.type === 'group') {
    const groupPerms = subPerms(parentPerms, field.name)
    return (field.fields ?? []).some((c) => isFieldVisible(c, groupPerms))
  }

  // Array / blocks / scalars / richText / upload: visible if readable.
  return true
}

/** @deprecated kept for compatibility — prefer canRead/canUpdate. */
export const isAllowed = (p: unknown): boolean => {
  if (p === undefined || p === null) return false
  if (p === true) return true
  if (p === false) return false
  if (typeof p === 'object' && 'permission' in (p as Record<string, unknown>)) {
    return Boolean((p as { permission: unknown }).permission)
  }
  return false
}

/** @deprecated The sanitized shape uses key-absence to signal deny, so a
 *  raw "look up field perms object" helper is dangerous — callers tend to
 *  check `result?.update` which returns the wrong answer. Use canRead /
 *  canUpdate / subPerms instead. Kept exported in case downstream code
 *  needed it. */
export const lookupFieldPerms = (parent: Perms, fieldName: string): Perms =>
  subPerms(parent, fieldName)

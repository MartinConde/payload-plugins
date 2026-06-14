import type { ExtractedField } from 'payload-plugin-shadcn-ui';
export type Perms = unknown;
/** Whether the current user can READ this child. Used to gate render. */
export declare const canRead: (parent: Perms, fieldName: string) => boolean;
/** Whether the current user can UPDATE this child. Used to gate input
 *  disabled state. */
export declare const canUpdate: (parent: Perms, fieldName: string) => boolean;
/** Whether the current user can CREATE this child. Used in create-mode forms
 *  to gate input disabled state (v3.18). Payload runs `access.create` only on
 *  create operations and `access.update` only on update operations, so callers
 *  pick the op that matches the current form operation rather than checking
 *  both. */
export declare const canCreate: (parent: Perms, fieldName: string) => boolean;
/** Get the sub-perms for a named child container (group / array / blocks /
 *  named tab). Returns the FieldPermissions entry for that child — which
 *  may be `true` (fully allowed), a partial object, or undefined (denied or
 *  no context). Callers should NOT inspect the result directly; pass it as
 *  `parentPerms` to subsequent canRead/canUpdate/isFieldVisible calls. */
export declare const subPerms: (parent: Perms, fieldName: string) => Perms;
/** Sub-perms for a specific block slug within a blocks field. */
export declare const subBlockPerms: (parent: Perms, fieldName: string, blockSlug: string) => Perms;
/** Recursive visibility check used to decide whether a structural container
 *  (row / collapsible / group / tabs) should render at all. Returns true if
 *  any leaf inside `field` is readable under `parentPerms`.
 *
 *  Synthesized fields (`__password`, `__confirmPassword`, etc.) are always
 *  considered visible — they're outside the schema's permission set. */
export declare const isFieldVisible: (field: ExtractedField, parentPerms: Perms) => boolean;
/** @deprecated kept for compatibility — prefer canRead/canUpdate. */
export declare const isAllowed: (p: unknown) => boolean;
/** @deprecated The sanitized shape uses key-absence to signal deny, so a
 *  raw "look up field perms object" helper is dangerous — callers tend to
 *  check `result?.update` which returns the wrong answer. Use canRead /
 *  canUpdate / subPerms instead. Kept exported in case downstream code
 *  needed it. */
export declare const lookupFieldPerms: (parent: Perms, fieldName: string) => Perms;

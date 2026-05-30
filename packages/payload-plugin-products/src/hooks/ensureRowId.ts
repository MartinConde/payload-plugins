import type { FieldHook } from 'payload'

/* Field-level beforeChange on a hidden `id` text field inside an array row:
   assign a stable crypto.randomUUID() if the row lacks one. The id never
   leaves the doc but the client form code keys off it (active-row state,
   diffing for the shadcn-admin doc-form bridge). Used by both the view rows
   and the per-view `colorMockups` rows. */
export const ensureRowId: FieldHook = ({ value }) =>
  typeof value === 'string' && value.length > 0 ? value : crypto.randomUUID()

/* Pure helpers over `ExtractedCollection.versions` for the auto doc form's
   drafts UI. Server-safe (no React, no DOM). v3.6. */

import type { ExtractedCollection } from 'payload-plugin-shadcn-ui'

/** Default autosave debounce — matches Payload's own default. */
export const DEFAULT_AUTOSAVE_INTERVAL_MS = 800

export const hasDraftsEnabled = (collection: ExtractedCollection): boolean => {
  const v = collection.versions
  return Boolean(v && v.drafts !== false && v.drafts !== undefined)
}

/** Returns the autosave debounce in ms when drafts + autosave are both on;
 *  null otherwise. Falls back to {@link DEFAULT_AUTOSAVE_INTERVAL_MS}. */
export const getAutosaveInterval = (
  collection: ExtractedCollection,
): number | null => {
  const v = collection.versions
  if (!v || v.drafts === false || v.drafts === undefined) return null
  const a = v.drafts.autosave
  if (a === false || a === undefined) return null
  return typeof a.interval === 'number' && a.interval > 0
    ? a.interval
    : DEFAULT_AUTOSAVE_INTERVAL_MS
}

/** Whether the Save-draft button should be visible. Payload's semantics:
 *  - drafts off → no draft button anywhere (the button-matrix collapses to
 *    a single Save).
 *  - drafts on, no autosave → show.
 *  - drafts on, autosave on, showSaveDraftButton undefined → show.
 *  - drafts on, autosave on, showSaveDraftButton: false → hide (autosave
 *    covers the draft path). */
export const shouldShowSaveDraftButton = (
  collection: ExtractedCollection,
): boolean => {
  const v = collection.versions
  if (!v || v.drafts === false || v.drafts === undefined) return false
  const a = v.drafts.autosave
  // No autosave config → always show the Save-draft button.
  // Autosave on → defer to its `showSaveDraftButton` flag (default true).
  if (!a) return true
  return a.showSaveDraftButton !== false
}

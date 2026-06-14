import type { ExtractedCollection } from 'payload-plugin-shadcn-ui';
/** Default autosave debounce — matches Payload's own default. */
export declare const DEFAULT_AUTOSAVE_INTERVAL_MS = 800;
export declare const hasDraftsEnabled: (collection: ExtractedCollection) => boolean;
/** Returns the autosave debounce in ms when drafts + autosave are both on;
 *  null otherwise. Falls back to {@link DEFAULT_AUTOSAVE_INTERVAL_MS}. */
export declare const getAutosaveInterval: (collection: ExtractedCollection) => number | null;
/** Whether the Save-draft button should be visible. Payload's semantics:
 *  - drafts off → no draft button anywhere (the button-matrix collapses to
 *    a single Save).
 *  - drafts on, no autosave → show.
 *  - drafts on, autosave on, showSaveDraftButton undefined → show.
 *  - drafts on, autosave on, showSaveDraftButton: false → hide (autosave
 *    covers the draft path). */
export declare const shouldShowSaveDraftButton: (collection: ExtractedCollection) => boolean;

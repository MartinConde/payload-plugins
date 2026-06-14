import type { ExtractedCollection } from 'payload-plugin-shadcn-ui';
/** Extracted `versions.drafts.schedulePublish` config (time-picker hints), or
 *  null when schedule-publish is not enabled for this collection / global.
 *  Truthy mirrors Payload's own `schedulePublish` drafts config — which is
 *  what registers the `schedulePublish` jobs task server-side, so this is the
 *  correct gate for showing the UI. */
export declare const getSchedulePublishConfig: (collection: ExtractedCollection) => {
    timeFormat?: string;
    timeIntervals?: number;
} | null;
/** Re-interpret a picked wall-clock time (whose Y/M/D/H/M are read in local
 *  time — what the Calendar + `<input type=time>` produce) as that same
 *  wall-clock in `timezone`, returning the absolute instant. This is what
 *  Payload's job runner stores as `waitUntil`. */
export declare const wallClockToInstant: (wallClock: Date, timezone: string) => Date;
/** Format a stored `waitUntil` instant for display in the timezone it was
 *  scheduled against (falls back to the viewer's local zone). */
export declare const formatScheduledDate: (iso: string, timezone?: string) => string;

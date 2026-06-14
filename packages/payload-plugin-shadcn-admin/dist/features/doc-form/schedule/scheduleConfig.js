/* Pure helpers for the schedule-publish surface. Server-safe (no React / DOM
   beyond the date math). The schedule popover only *queues* jobs through
   Payload's `schedule-publish` server function — execution is the consuming
   app's jobs queue (`jobs.autoRun` / external cron). */ import { TZDate } from '@date-fns/tz';
/** Extracted `versions.drafts.schedulePublish` config (time-picker hints), or
 *  null when schedule-publish is not enabled for this collection / global.
 *  Truthy mirrors Payload's own `schedulePublish` drafts config — which is
 *  what registers the `schedulePublish` jobs task server-side, so this is the
 *  correct gate for showing the UI. */ export const getSchedulePublishConfig = (collection)=>{
    const v = collection.versions;
    if (!v || v.drafts === false || v.drafts === undefined) return null;
    const sp = v.drafts.schedulePublish;
    if (!sp) return null;
    return sp;
};
/** Re-interpret a picked wall-clock time (whose Y/M/D/H/M are read in local
 *  time — what the Calendar + `<input type=time>` produce) as that same
 *  wall-clock in `timezone`, returning the absolute instant. This is what
 *  Payload's job runner stores as `waitUntil`. */ export const wallClockToInstant = (wallClock, timezone)=>{
    const tz = new TZDate(wallClock.getFullYear(), wallClock.getMonth(), wallClock.getDate(), wallClock.getHours(), wallClock.getMinutes(), 0, timezone);
    return new Date(tz.getTime());
};
/** Format a stored `waitUntil` instant for display in the timezone it was
 *  scheduled against (falls back to the viewer's local zone). */ export const formatScheduledDate = (iso, timezone)=>{
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...timezone ? {
            timeZone: timezone,
            timeZoneName: 'short'
        } : {}
    });
};

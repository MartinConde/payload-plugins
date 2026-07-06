'use client'

/* The "Upcoming" list at the bottom of SchedulePublishPopover: one row per
   queued schedulePublish job, with a cancel button. Split out since it only
   needs the job list + a cancel callback, not the scheduling form state. */

import * as React from 'react'
import { ArrowUpCircle, CalendarClock, Trash2, XCircle } from 'lucide-react'
import { Badge } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import { formatScheduledDate } from './scheduleConfig.js'
import type { UpcomingJob } from './SchedulePublishPopover.js'

export function UpcomingJobsList({
  upcoming,
  processing,
  onCancel,
}: {
  upcoming: UpcomingJob[] | null
  processing: boolean
  onCancel: (jobId: number | string) => void
}): React.ReactElement {
  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Upcoming</span>
        {upcoming && upcoming.length > 0 ? (
          <Badge variant="secondary" className="px-1.5">
            {upcoming.length}
          </Badge>
        ) : null}
      </div>
      {upcoming === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-md border border-dashed py-5 text-center">
          <CalendarClock className="size-5 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No scheduled events</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {upcoming.map((job) => {
            const isUnpublish = job.input?.type === 'unpublish'
            return (
              <li
                key={String(job.id)}
                className="group flex items-center gap-2.5 rounded-md border bg-card p-2.5 text-sm transition-colors hover:bg-accent/40"
              >
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    isUnpublish
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  {isUnpublish ? (
                    <XCircle className="size-4" />
                  ) : (
                    <ArrowUpCircle className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium capitalize">
                      {job.input?.type ?? 'publish'}
                    </span>
                    {job.input?.locale ? (
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px] uppercase tracking-wider"
                      >
                        {job.input.locale}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {job.waitUntil
                      ? formatScheduledDate(job.waitUntil, job.input?.timezone)
                      : '—'}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => onCancel(job.id)}
                  disabled={processing}
                  aria-label="Cancel scheduled event"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

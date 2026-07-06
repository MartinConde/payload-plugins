'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* The "Upcoming" list at the bottom of SchedulePublishPopover: one row per
   queued schedulePublish job, with a cancel button. Split out since it only
   needs the job list + a cancel callback, not the scheduling form state. */ import * as React from 'react';
import { ArrowUpCircle, CalendarClock, Trash2, XCircle } from 'lucide-react';
import { Badge } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { formatScheduledDate } from './scheduleConfig.js';
export function UpcomingJobsList({ upcoming, processing, onCancel }) {
    return /*#__PURE__*/ _jsxs("div", {
        className: "space-y-2 p-3",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        className: "text-sm font-medium",
                        children: "Upcoming"
                    }),
                    upcoming && upcoming.length > 0 ? /*#__PURE__*/ _jsx(Badge, {
                        variant: "secondary",
                        className: "px-1.5",
                        children: upcoming.length
                    }) : null
                ]
            }),
            upcoming === null ? /*#__PURE__*/ _jsx("p", {
                className: "text-sm text-muted-foreground",
                children: "Loading…"
            }) : upcoming.length === 0 ? /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-col items-center gap-1.5 rounded-md border border-dashed py-5 text-center",
                children: [
                    /*#__PURE__*/ _jsx(CalendarClock, {
                        className: "size-5 text-muted-foreground/60"
                    }),
                    /*#__PURE__*/ _jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: "No scheduled events"
                    })
                ]
            }) : /*#__PURE__*/ _jsx("ul", {
                className: "space-y-1.5",
                children: upcoming.map((job)=>{
                    const isUnpublish = job.input?.type === 'unpublish';
                    return /*#__PURE__*/ _jsxs("li", {
                        className: "group flex items-center gap-2.5 rounded-md border bg-card p-2.5 text-sm transition-colors hover:bg-accent/40",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                className: cn('flex size-8 shrink-0 items-center justify-center rounded-full', isUnpublish ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'),
                                children: isUnpublish ? /*#__PURE__*/ _jsx(XCircle, {
                                    className: "size-4"
                                }) : /*#__PURE__*/ _jsx(ArrowUpCircle, {
                                    className: "size-4"
                                })
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "min-w-0 flex-1",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex items-center gap-1.5",
                                        children: [
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "font-medium capitalize",
                                                children: job.input?.type ?? 'publish'
                                            }),
                                            job.input?.locale ? /*#__PURE__*/ _jsx(Badge, {
                                                variant: "outline",
                                                className: "px-1.5 py-0 text-[10px] uppercase tracking-wider",
                                                children: job.input.locale
                                            }) : null
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "truncate text-xs text-muted-foreground",
                                        children: job.waitUntil ? formatScheduledDate(job.waitUntil, job.input?.timezone) : '—'
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsx(Button, {
                                type: "button",
                                variant: "ghost",
                                size: "icon",
                                className: "size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100",
                                onClick: ()=>onCancel(job.id),
                                disabled: processing,
                                "aria-label": "Cancel scheduled event",
                                children: /*#__PURE__*/ _jsx(Trash2, {
                                    className: "size-4"
                                })
                            })
                        ]
                    }, String(job.id));
                })
            })
        ]
    });
}

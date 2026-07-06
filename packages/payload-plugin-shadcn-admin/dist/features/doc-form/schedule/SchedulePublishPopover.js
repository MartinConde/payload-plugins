'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Schedule-publish surface — shadcn replacement for Payload's native
   PublishButton/ScheduleDrawer. Opens a popover next to the Publish button.
   Full parity: schedule a future publish OR unpublish, list upcoming events,
   cancel them. A timezone picker lets the user schedule against any zone.

   The UI only QUEUES / LISTS / CANCELS jobs through Payload's `schedulePublish`
   server function (same `useServerFunctions()` seam the bridge uses for
   `getFormState`). Execution at `waitUntil` is the consuming app's jobs queue
   (`jobs.autoRun` / external cron) — see SETUP.md. */ import * as React from 'react';
import { ArrowUpCircle, CalendarClock, Clock, XCircle } from 'lucide-react';
import { toast, useConfig, useServerFunctions, useTranslation } from '../../../internal/payloadAdapterUI.js';
import { formatAdminURL } from '../../../internal/payloadAdapter.js';
import * as qs from 'qs-esm';
import { Badge } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { Calendar } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
import { Separator } from 'payload-plugin-shadcn-ui';
import { formatScheduledDate, wallClockToInstant } from './scheduleConfig.js';
import { TimezonePicker } from './TimezonePicker.js';
import { UpcomingJobsList } from './UpcomingJobsList.js';
const ALL_LOCALES = '__all__';
/* Local "HH:mm" from a Date's local hours/minutes — mirrors DateInput.tsx. */ const toTimeString = (d)=>{
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};
export function SchedulePublishPopover({ collectionSlug, globalSlug, docId, isGlobal, locales, timeIntervals, disabled }) {
    const { t } = useTranslation();
    const serverFunctions = useServerFunctions();
    const { config } = useConfig();
    const tzConfig = config.admin?.timezones;
    const supportedTimezones = tzConfig?.supportedTimezones ?? [];
    const apiRoute = config.routes?.api;
    const serverURL = config.serverURL;
    const [open, setOpen] = React.useState(false);
    const [type, setType] = React.useState('publish');
    const [pickedDate, setPickedDate] = React.useState(null);
    const [timezone, setTimezone] = React.useState(tzConfig?.defaultTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [localeToPublish, setLocaleToPublish] = React.useState(ALL_LOCALES);
    const [processing, setProcessing] = React.useState(false);
    const [upcoming, setUpcoming] = React.useState(null);
    // Preview the absolute instant the picked wall-clock maps to, in the chosen
    // zone — so the user can confirm what they're scheduling before committing.
    const scheduledSummary = pickedDate ? formatScheduledDate(wallClockToInstant(pickedDate, timezone).toISOString(), timezone) : null;
    // Mirrors native: a single-locale publish is offered for any localized
    // collection/global (the `schedulePublish` handler passes `localeToPublish`
    // → `publishSpecificLocale`), not only `localizeStatus`-enabled ones.
    const showLocalePicker = type === 'publish' && Boolean(locales && locales.length > 1);
    const fetchUpcoming = React.useCallback(async ()=>{
        if (!apiRoute) return;
        const and = [
            {
                taskSlug: {
                    equals: 'schedulePublish'
                }
            },
            {
                waitUntil: {
                    greater_than: new Date().toISOString()
                }
            }
        ];
        if (isGlobal && globalSlug) {
            and.push({
                'input.global': {
                    equals: globalSlug
                }
            });
        } else if (collectionSlug) {
            and.push({
                'input.doc.value': {
                    equals: String(docId)
                }
            });
            and.push({
                'input.doc.relationTo': {
                    equals: collectionSlug
                }
            });
        }
        const body = qs.stringify({
            sort: 'waitUntil',
            where: {
                and
            }
        });
        try {
            const res = await fetch(formatAdminURL({
                apiRoute,
                path: '/payload-jobs',
                serverURL: serverURL || ''
            }), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Payload-HTTP-Method-Override': 'GET'
                },
                body
            });
            const json = await res.json();
            setUpcoming(json.docs ?? []);
        } catch (err) {
            setUpcoming([]);
            toast.error(err instanceof Error ? err.message : 'Failed to load events');
        }
    }, [
        apiRoute,
        serverURL,
        isGlobal,
        globalSlug,
        collectionSlug,
        docId
    ]);
    // Lazy-load the upcoming list the first time the popover opens.
    React.useEffect(()=>{
        if (open && upcoming === null) void fetchUpcoming();
    }, [
        open,
        upcoming,
        fetchUpcoming
    ]);
    const handleDaySelect = (day)=>{
        if (!day) {
            setPickedDate(null);
            return;
        }
        const next = new Date(day);
        const base = pickedDate ?? new Date();
        next.setHours(base.getHours(), base.getMinutes(), 0, 0);
        setPickedDate(next);
    };
    const handleTimeChange = (raw)=>{
        if (!raw) return;
        const [h, m] = raw.split(':').map((n)=>Number(n));
        const base = pickedDate ? new Date(pickedDate) : new Date();
        base.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
        setPickedDate(base);
    };
    const handleSchedule = async ()=>{
        if (!pickedDate) {
            toast.error(t('shadcnAdmin:pickDateAndTime'));
            return;
        }
        const instant = wallClockToInstant(pickedDate, timezone);
        if (instant.getTime() <= Date.now()) {
            toast.error(t('shadcnAdmin:pickTimeInFuture'));
            return;
        }
        setProcessing(true);
        try {
            const result = await serverFunctions.schedulePublish({
                type,
                date: instant,
                timezone,
                ...showLocalePicker && localeToPublish !== ALL_LOCALES ? {
                    localeToPublish
                } : {},
                ...isGlobal ? {
                    global: globalSlug
                } : {
                    doc: {
                        relationTo: collectionSlug,
                        value: String(docId)
                    }
                }
            });
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success('Scheduled');
                setPickedDate(null);
                await fetchUpcoming();
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Scheduling failed');
        } finally{
            setProcessing(false);
        }
    };
    const handleCancel = async (jobId)=>{
        setProcessing(true);
        try {
            const result = await serverFunctions.schedulePublish({
                deleteID: jobId
            });
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success('Canceled');
                await fetchUpcoming();
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Cancel failed');
        } finally{
            setProcessing(false);
        }
    };
    const upcomingCount = upcoming?.length ?? 0;
    return /*#__PURE__*/ _jsxs(Popover, {
        open: open,
        onOpenChange: setOpen,
        children: [
            /*#__PURE__*/ _jsx(PopoverTrigger, {
                asChild: true,
                children: /*#__PURE__*/ _jsxs(Button, {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    disabled: disabled,
                    "aria-label": "Schedule publish",
                    children: [
                        /*#__PURE__*/ _jsx(CalendarClock, {
                            className: "size-4"
                        }),
                        "Schedule",
                        upcomingCount > 0 ? /*#__PURE__*/ _jsx(Badge, {
                            variant: "secondary",
                            className: "ml-1 px-1.5",
                            children: upcomingCount
                        }) : null
                    ]
                })
            }),
            /*#__PURE__*/ _jsxs(PopoverContent, {
                className: "w-[22rem] p-0",
                align: "end",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "space-y-3 p-3",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "grid grid-cols-2 gap-1 rounded-md bg-muted p-1",
                                role: "group",
                                "aria-label": "Schedule type",
                                children: [
                                    /*#__PURE__*/ _jsxs(Button, {
                                        type: "button",
                                        size: "sm",
                                        variant: type === 'publish' ? 'default' : 'ghost',
                                        className: "h-7",
                                        "aria-pressed": type === 'publish',
                                        onClick: ()=>setType('publish'),
                                        disabled: processing,
                                        children: [
                                            /*#__PURE__*/ _jsx(ArrowUpCircle, {
                                                className: "size-3.5"
                                            }),
                                            "Publish"
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs(Button, {
                                        type: "button",
                                        size: "sm",
                                        variant: type === 'unpublish' ? 'default' : 'ghost',
                                        className: "h-7",
                                        "aria-pressed": type === 'unpublish',
                                        onClick: ()=>setType('unpublish'),
                                        disabled: processing,
                                        children: [
                                            /*#__PURE__*/ _jsx(XCircle, {
                                                className: "size-3.5"
                                            }),
                                            "Unpublish"
                                        ]
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "space-y-1.5",
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "text-sm font-medium",
                                        children: "Date & time"
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "rounded-md border",
                                        children: [
                                            /*#__PURE__*/ _jsx(Calendar, {
                                                mode: "single",
                                                className: "p-2",
                                                selected: pickedDate ?? undefined,
                                                onSelect: handleDaySelect,
                                                // Start-of-day so today stays selectable; the real future-time
                                                // guard is the submit-time `instant <= now` check.
                                                disabled: {
                                                    before: new Date(new Date().setHours(0, 0, 0, 0))
                                                }
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "flex items-center gap-2 border-t p-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx(Clock, {
                                                        className: "size-4 text-muted-foreground"
                                                    }),
                                                    /*#__PURE__*/ _jsx(Input, {
                                                        type: "time",
                                                        step: timeIntervals ? timeIntervals * 60 : undefined,
                                                        className: "h-8 w-auto",
                                                        value: pickedDate ? toTimeString(pickedDate) : '',
                                                        onChange: (e)=>handleTimeChange(e.target.value),
                                                        disabled: processing
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            }),
                            supportedTimezones.length > 0 ? /*#__PURE__*/ _jsxs("div", {
                                className: "space-y-1.5",
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "text-sm font-medium",
                                        children: "Timezone"
                                    }),
                                    /*#__PURE__*/ _jsx(TimezonePicker, {
                                        value: timezone,
                                        onChange: setTimezone,
                                        options: supportedTimezones,
                                        disabled: processing
                                    })
                                ]
                            }) : null,
                            showLocalePicker ? /*#__PURE__*/ _jsxs("div", {
                                className: "space-y-1.5",
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "text-sm font-medium",
                                        children: "Locale to publish"
                                    }),
                                    /*#__PURE__*/ _jsxs(Select, {
                                        value: localeToPublish,
                                        onValueChange: setLocaleToPublish,
                                        disabled: processing,
                                        children: [
                                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                                className: "h-9 w-full",
                                                children: /*#__PURE__*/ _jsx(SelectValue, {})
                                            }),
                                            /*#__PURE__*/ _jsxs(SelectContent, {
                                                children: [
                                                    /*#__PURE__*/ _jsx(SelectItem, {
                                                        value: ALL_LOCALES,
                                                        children: "All locales"
                                                    }),
                                                    locales?.map((loc)=>/*#__PURE__*/ _jsx(SelectItem, {
                                                            value: loc.code,
                                                            children: loc.label
                                                        }, loc.code))
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            }) : null,
                            scheduledSummary ? /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-start gap-2 rounded-md bg-muted/60 px-2.5 py-2 text-sm",
                                children: [
                                    /*#__PURE__*/ _jsx(CalendarClock, {
                                        className: "mt-0.5 size-4 shrink-0 text-muted-foreground"
                                    }),
                                    /*#__PURE__*/ _jsxs("span", {
                                        children: [
                                            "Will ",
                                            type,
                                            ' ',
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "font-medium",
                                                children: scheduledSummary
                                            })
                                        ]
                                    })
                                ]
                            }) : null,
                            /*#__PURE__*/ _jsx(Button, {
                                type: "button",
                                size: "sm",
                                className: "w-full",
                                onClick: handleSchedule,
                                disabled: processing || !pickedDate,
                                children: processing ? 'Scheduling…' : `Schedule ${type === 'publish' ? 'publish' : 'unpublish'}`
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsx(Separator, {}),
                    /*#__PURE__*/ _jsx(UpcomingJobsList, {
                        upcoming: upcoming,
                        processing: processing,
                        onCancel: (jobId)=>void handleCancel(jobId)
                    })
                ]
            })
        ]
    });
}

'use client'

/* Schedule-publish surface — shadcn replacement for Payload's native
   PublishButton/ScheduleDrawer. Opens a popover next to the Publish button.
   Full parity: schedule a future publish OR unpublish, list upcoming events,
   cancel them. A timezone picker lets the user schedule against any zone.

   The UI only QUEUES / LISTS / CANCELS jobs through Payload's `schedulePublish`
   server function (same `useServerFunctions()` seam the bridge uses for
   `getFormState`). Execution at `waitUntil` is the consuming app's jobs queue
   (`jobs.autoRun` / external cron) — see SETUP.md. */

import * as React from 'react'
import {
  ArrowUpCircle,
  CalendarClock,
  Check,
  ChevronsUpDown,
  Clock,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  toast,
  useConfig,
  useServerFunctions,
  useTranslation,
} from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { formatAdminURL } from '../../../internal/payloadAdapter.js'
import * as qs from 'qs-esm'

import { Badge } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import { Calendar } from 'payload-plugin-shadcn-ui'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'payload-plugin-shadcn-ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'
import { Separator } from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import type { ExtractedLocale } from '../localization/LocaleSwitcher.js'
import {
  formatScheduledDate,
  wallClockToInstant,
} from './scheduleConfig.js'

const ALL_LOCALES = '__all__'

type ScheduleType = 'publish' | 'unpublish'

type UpcomingJob = {
  id: number | string
  waitUntil?: string
  input?: {
    type?: ScheduleType
    locale?: string
    timezone?: string
  }
}

export type SchedulePublishPopoverProps = {
  /** Set for collection docs. */
  collectionSlug?: string
  /** Set for global (singleton) docs. */
  globalSlug?: string
  docId?: string | number
  isGlobal: boolean
  locales?: ExtractedLocale[]
  /** Time-picker hints from `versions.drafts.schedulePublish`. */
  timeIntervals?: number
  disabled?: boolean
}

/* Local "HH:mm" from a Date's local hours/minutes — mirrors DateInput.tsx. */
const toTimeString = (d: Date): string => {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function SchedulePublishPopover({
  collectionSlug,
  globalSlug,
  docId,
  isGlobal,
  locales,
  timeIntervals,
  disabled,
}: SchedulePublishPopoverProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const serverFunctions = useServerFunctions() as unknown as {
    schedulePublish: (args: Record<string, unknown>) => Promise<{
      error?: string
      message?: string
    }>
  }
  const { config } = useConfig()
  const tzConfig = (
    config as unknown as {
      admin?: {
        timezones?: {
          defaultTimezone?: string
          supportedTimezones?: { label: string; value: string }[]
        }
      }
    }
  ).admin?.timezones
  const supportedTimezones = tzConfig?.supportedTimezones ?? []
  const apiRoute = (config as unknown as { routes?: { api?: string } }).routes
    ?.api
  const serverURL = (config as unknown as { serverURL?: string }).serverURL

  const [open, setOpen] = React.useState(false)
  const [type, setType] = React.useState<ScheduleType>('publish')
  const [pickedDate, setPickedDate] = React.useState<Date | null>(null)
  const [timezone, setTimezone] = React.useState<string>(
    tzConfig?.defaultTimezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [localeToPublish, setLocaleToPublish] =
    React.useState<string>(ALL_LOCALES)
  const [tzPickerOpen, setTzPickerOpen] = React.useState(false)
  const [processing, setProcessing] = React.useState(false)
  const [upcoming, setUpcoming] = React.useState<UpcomingJob[] | null>(null)

  const selectedTzLabel =
    supportedTimezones.find((tz) => tz.value === timezone)?.label ?? timezone

  // Preview the absolute instant the picked wall-clock maps to, in the chosen
  // zone — so the user can confirm what they're scheduling before committing.
  const scheduledSummary = pickedDate
    ? formatScheduledDate(
        wallClockToInstant(pickedDate, timezone).toISOString(),
        timezone,
      )
    : null

  // Mirrors native: a single-locale publish is offered for any localized
  // collection/global (the `schedulePublish` handler passes `localeToPublish`
  // → `publishSpecificLocale`), not only `localizeStatus`-enabled ones.
  const showLocalePicker =
    type === 'publish' && Boolean(locales && locales.length > 1)

  const fetchUpcoming = React.useCallback(async () => {
    if (!apiRoute) return
    const and: Record<string, unknown>[] = [
      { taskSlug: { equals: 'schedulePublish' } },
      { waitUntil: { greater_than: new Date().toISOString() } },
    ]
    if (isGlobal && globalSlug) {
      and.push({ 'input.global': { equals: globalSlug } })
    } else if (collectionSlug) {
      and.push({ 'input.doc.value': { equals: String(docId) } })
      and.push({ 'input.doc.relationTo': { equals: collectionSlug } })
    }
    const body = qs.stringify({ sort: 'waitUntil', where: { and } })
    try {
      const res = await fetch(
        formatAdminURL({
          apiRoute,
          path: '/payload-jobs',
          serverURL: serverURL || '',
        }),
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Payload-HTTP-Method-Override': 'GET',
          },
          body,
        },
      )
      const json = (await res.json()) as { docs?: UpcomingJob[] }
      setUpcoming(json.docs ?? [])
    } catch (err) {
      setUpcoming([])
      toast.error(err instanceof Error ? err.message : 'Failed to load events')
    }
  }, [apiRoute, serverURL, isGlobal, globalSlug, collectionSlug, docId])

  // Lazy-load the upcoming list the first time the popover opens.
  React.useEffect(() => {
    if (open && upcoming === null) void fetchUpcoming()
  }, [open, upcoming, fetchUpcoming])

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) {
      setPickedDate(null)
      return
    }
    const next = new Date(day)
    const base = pickedDate ?? new Date()
    next.setHours(base.getHours(), base.getMinutes(), 0, 0)
    setPickedDate(next)
  }

  const handleTimeChange = (raw: string) => {
    if (!raw) return
    const [h, m] = raw.split(':').map((n) => Number(n))
    const base = pickedDate ? new Date(pickedDate) : new Date()
    base.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)
    setPickedDate(base)
  }

  const handleSchedule = async () => {
    if (!pickedDate) {
      toast.error(t('shadcnAdmin:pickDateAndTime'))
      return
    }
    const instant = wallClockToInstant(pickedDate, timezone)
    if (instant.getTime() <= Date.now()) {
      toast.error(t('shadcnAdmin:pickTimeInFuture'))
      return
    }
    setProcessing(true)
    try {
      const result = await serverFunctions.schedulePublish({
        type,
        date: instant,
        timezone,
        ...(showLocalePicker && localeToPublish !== ALL_LOCALES
          ? { localeToPublish }
          : {}),
        ...(isGlobal
          ? { global: globalSlug }
          : {
              doc: { relationTo: collectionSlug, value: String(docId) },
            }),
      })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Scheduled')
        setPickedDate(null)
        await fetchUpcoming()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scheduling failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async (jobId: number | string) => {
    setProcessing(true)
    try {
      const result = await serverFunctions.schedulePublish({ deleteID: jobId })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Canceled')
        await fetchUpcoming()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setProcessing(false)
    }
  }

  const upcomingCount = upcoming?.length ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label="Schedule publish"
        >
          <CalendarClock className="size-4" />
          Schedule
          {upcomingCount > 0 ? (
            <Badge variant="secondary" className="ml-1 px-1.5">
              {upcomingCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0" align="end">
        <div className="space-y-3 p-3">
          <div
            className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
            role="group"
            aria-label="Schedule type"
          >
            <Button
              type="button"
              size="sm"
              variant={type === 'publish' ? 'default' : 'ghost'}
              className="h-7"
              aria-pressed={type === 'publish'}
              onClick={() => setType('publish')}
              disabled={processing}
            >
              <ArrowUpCircle className="size-3.5" />
              Publish
            </Button>
            <Button
              type="button"
              size="sm"
              variant={type === 'unpublish' ? 'default' : 'ghost'}
              className="h-7"
              aria-pressed={type === 'unpublish'}
              onClick={() => setType('unpublish')}
              disabled={processing}
            >
              <XCircle className="size-3.5" />
              Unpublish
            </Button>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Date &amp; time</span>
            <div className="rounded-md border">
              <Calendar
                mode="single"
                className="p-2"
                selected={pickedDate ?? undefined}
                onSelect={handleDaySelect}
                // Start-of-day so today stays selectable; the real future-time
                // guard is the submit-time `instant <= now` check.
                disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
              />
              <div className="flex items-center gap-2 border-t p-2">
                <Clock className="size-4 text-muted-foreground" />
                <Input
                  type="time"
                  step={timeIntervals ? timeIntervals * 60 : undefined}
                  className="h-8 w-auto"
                  value={pickedDate ? toTimeString(pickedDate) : ''}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={processing}
                />
              </div>
            </div>
          </div>

          {supportedTimezones.length > 0 ? (
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Timezone</span>
              <Popover open={tzPickerOpen} onOpenChange={setTzPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={tzPickerOpen}
                    className="h-9 w-full justify-between font-normal"
                    disabled={processing}
                  >
                    <span className="truncate">{selectedTzLabel}</span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search timezone…" />
                    <CommandList>
                      <CommandEmpty>No timezone found.</CommandEmpty>
                      <CommandGroup>
                        {supportedTimezones.map((tz) => (
                          <CommandItem
                            key={tz.value}
                            value={tz.label}
                            onSelect={() => {
                              setTimezone(tz.value)
                              setTzPickerOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'size-4',
                                timezone === tz.value
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <span className="truncate">{tz.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : null}

          {showLocalePicker ? (
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Locale to publish</span>
              <Select
                value={localeToPublish}
                onValueChange={setLocaleToPublish}
                disabled={processing}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LOCALES}>All locales</SelectItem>
                  {locales?.map((loc) => (
                    <SelectItem key={loc.code} value={loc.code}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {scheduledSummary ? (
            <div className="flex items-start gap-2 rounded-md bg-muted/60 px-2.5 py-2 text-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                Will {type}{' '}
                <span className="font-medium">{scheduledSummary}</span>
              </span>
            </div>
          ) : null}

          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={handleSchedule}
            disabled={processing || !pickedDate}
          >
            {processing
              ? 'Scheduling…'
              : `Schedule ${type === 'publish' ? 'publish' : 'unpublish'}`}
          </Button>
        </div>

        <Separator />

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
              <p className="text-sm text-muted-foreground">
                No scheduled events
              </p>
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
                          ? formatScheduledDate(
                              job.waitUntil,
                              job.input?.timezone,
                            )
                          : '—'}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => void handleCancel(job.id)}
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
      </PopoverContent>
    </Popover>
  )
}

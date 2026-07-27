/* OpenPanel analytics widget — see the "external API" example in the widget
   docs (contributing/dashboard-widgets-internals in the starter's docs app),
   which this follows: an async Server Component that fetches its own
   data and quietly omits itself (returns null) if the fetch fails or isn't
   configured. Uses the older `/insights/:projectId/metrics` route rather than
   `/overview` — `/overview` was only added upstream in April 2026, so
   self-hosted instances on an older image 404 on it; `/metrics` has been
   stable since OpenPanel's insights API first shipped (Sept 2025). Response
   shape confirmed against OpenPanel's own source
   (packages/db/src/services/overview.service.ts, OverviewService#getMetrics)
   since the public API reference docs don't render a JSON example. */

import * as React from 'react'
import { BarChart3 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'payload-plugin-shadcn-ui'

// GET {apiUrl}/insights/{projectId}/metrics — see OverviewService#getMetrics.
// avg_session_duration is in seconds; bounce_rate is already 0-100.
type OpenPanelMetrics = {
  metrics: {
    avg_session_duration: number
    bounce_rate: number
    total_screen_views: number
    total_sessions: number
    unique_visitors: number
  }
}

const numberFormat = (n: number): string => new Intl.NumberFormat().format(n)

const durationFormat = (seconds: number): string => {
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export async function OpenPanelAnalyticsWidget({
  apiUrl,
  clientId,
  clientSecret,
  description,
  labels,
  projectId,
  title,
}: {
  apiUrl: string
  clientId: string
  clientSecret: string
  description: string
  labels: {
    avgSessionDuration: string
    bounceRate: string
    pageviews: string
    visitors: string
  }
  projectId: string
  title: string
}): Promise<React.ReactElement | null> {
  let data: OpenPanelMetrics | null = null
  try {
    const res = await fetch(
      `${apiUrl}/insights/${encodeURIComponent(projectId)}/metrics?range=7d`,
      {
        headers: {
          'openpanel-client-id': clientId,
          'openpanel-client-secret': clientSecret,
        },
        // Cache per Next.js's fetch semantics — tune to how fresh you need this.
        next: { revalidate: 300 },
      },
    )
    if (res.ok) {
      data = await res.json()
    } else {
      console.error(
        `[OpenPanelAnalyticsWidget] ${res.status} ${res.statusText} from ${apiUrl} — ${await res.text()}`,
      )
    }
  } catch (err) {
    console.error('[OpenPanelAnalyticsWidget] fetch failed:', err)
  }
  if (!data) return null

  const { metrics } = data
  const stats: { label: string; value: string }[] = [
    { label: labels.visitors, value: numberFormat(metrics.unique_visitors) },
    { label: labels.pageviews, value: numberFormat(metrics.total_screen_views) },
    { label: labels.bounceRate, value: `${metrics.bounce_rate}%` },
    {
      label: labels.avgSessionDuration,
      value: durationFormat(metrics.avg_session_duration),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

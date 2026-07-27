import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
   since the public API reference docs don't render a JSON example. */ import * as React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'payload-plugin-shadcn-ui';
const numberFormat = (n)=>new Intl.NumberFormat().format(n);
const durationFormat = (seconds)=>{
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
export async function OpenPanelAnalyticsWidget({ apiUrl, clientId, clientSecret, description, labels, projectId, title }) {
    let data = null;
    try {
        const res = await fetch(`${apiUrl}/insights/${encodeURIComponent(projectId)}/metrics?range=7d`, {
            headers: {
                'openpanel-client-id': clientId,
                'openpanel-client-secret': clientSecret
            },
            // Cache per Next.js's fetch semantics — tune to how fresh you need this.
            next: {
                revalidate: 300
            }
        });
        if (res.ok) {
            data = await res.json();
        } else {
            console.error(`[OpenPanelAnalyticsWidget] ${res.status} ${res.statusText} from ${apiUrl} — ${await res.text()}`);
        }
    } catch (err) {
        console.error('[OpenPanelAnalyticsWidget] fetch failed:', err);
    }
    if (!data) return null;
    const { metrics } = data;
    const stats = [
        {
            label: labels.visitors,
            value: numberFormat(metrics.unique_visitors)
        },
        {
            label: labels.pageviews,
            value: numberFormat(metrics.total_screen_views)
        },
        {
            label: labels.bounceRate,
            value: `${metrics.bounce_rate}%`
        },
        {
            label: labels.avgSessionDuration,
            value: durationFormat(metrics.avg_session_duration)
        }
    ];
    return /*#__PURE__*/ _jsxs(Card, {
        children: [
            /*#__PURE__*/ _jsxs(CardHeader, {
                children: [
                    /*#__PURE__*/ _jsxs(CardTitle, {
                        className: "flex items-center gap-2 text-base",
                        children: [
                            /*#__PURE__*/ _jsx(BarChart3, {
                                className: "size-4 text-muted-foreground"
                            }),
                            title
                        ]
                    }),
                    /*#__PURE__*/ _jsx(CardDescription, {
                        children: description
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(CardContent, {
                children: /*#__PURE__*/ _jsx("div", {
                    className: "grid grid-cols-2 gap-4 sm:grid-cols-4",
                    children: stats.map((stat)=>/*#__PURE__*/ _jsxs("div", {
                            className: "space-y-1",
                            children: [
                                /*#__PURE__*/ _jsx("p", {
                                    className: "text-2xl font-semibold tabular-nums",
                                    children: stat.value
                                }),
                                /*#__PURE__*/ _jsx("p", {
                                    className: "text-xs text-muted-foreground",
                                    children: stat.label
                                })
                            ]
                        }, stat.label))
                })
            })
        ]
    });
}

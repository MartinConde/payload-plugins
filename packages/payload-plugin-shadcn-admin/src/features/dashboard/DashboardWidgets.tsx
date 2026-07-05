/* Widget content for the two built-in dashboard widgets. No 'use client'
   directive — these render as Server Components, produced by AutoDashboardView
   and handed to the client-side DashboardGrid as pre-rendered nodes (see
   DashboardGrid.tsx for why that split is safe: dnd-kit only needs to move
   opaque nodes around, not re-render their contents). */

import * as React from 'react'
import Link from 'next/link'
import { Clock, FileText, Layers, Plus } from 'lucide-react'

import { Badge } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'payload-plugin-shadcn-ui'

export type DashboardItem = {
  count?: number
  createHref?: string
  label: string
  listHref: string
  slug: string
  type: 'collections' | 'globals'
}

export type DashboardSection = {
  items: DashboardItem[]
  label: string
}

export type RecentDoc = {
  collectionLabel: string
  href: string
  title: string
  updatedAt: string | null
}

const relativeTime = (iso: string | null): string => {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = then - Date.now()
  const abs = Math.abs(diffMs)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
  ]
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diffMs / ms), unit)
  }
  return rtf.format(Math.round(diffMs / 1000), 'second')
}

export function RecentlyUpdatedWidget({
  recent,
  title,
}: {
  recent: RecentDoc[]
  title: string
}): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {recent.map((doc) => (
            <li key={doc.href}>
              <Link
                className="flex items-center justify-between gap-3 px-6 py-2.5 text-sm transition-colors hover:bg-accent"
                href={doc.href}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{doc.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {doc.collectionLabel}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(doc.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function CollectionsWidget({
  sections,
}: {
  sections: DashboardSection[]
}): React.ReactElement {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.label} className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {section.label}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <Card key={`${item.type}:${item.slug}`} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="flex min-w-0 items-center gap-2">
                      <Layers className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.type === 'collections' &&
                      typeof item.count === 'number' && (
                        <Badge variant="secondary">
                          {new Intl.NumberFormat().format(item.count)}
                        </Badge>
                      )}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="mt-auto gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.listHref}>
                      {item.type === 'globals' ? 'Open' : 'View all'}
                    </Link>
                  </Button>
                  {item.createHref && (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={item.createHref}>
                        <Plus className="size-4" />
                        New
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

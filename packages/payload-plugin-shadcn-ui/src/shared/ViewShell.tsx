'use client'

import * as React from 'react'

import { cn } from './utils.js'

import { ViewHeader, type Crumb } from './ViewHeader.js'

type ViewShellProps = {
  breadcrumbs?: Crumb[]
  children: React.ReactNode
  className?: string
  contentClassName?: string
  headerActions?: React.ReactNode
}

/* Standard wrapper for a custom Payload admin view. Scopes Tailwind preflight
   via .twp, mounts the sidebar trigger + breadcrumb header, and provides a
   padded content slot. Pass contentClassName="p-0" for full-bleed layouts. */
export function ViewShell({
  breadcrumbs,
  children,
  className,
  contentClassName,
  headerActions,
}: ViewShellProps) {
  return (
    <div className={cn('twp flex flex-1 flex-col', className)}>
      <ViewHeader breadcrumbs={breadcrumbs} actions={headerActions} />
      <div className={cn('space-y-4 p-6', contentClassName)}>{children}</div>
    </div>
  )
}

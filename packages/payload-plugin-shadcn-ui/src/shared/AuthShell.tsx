'use client'

/* Centered-card shell for Payload's PRE-AUTH views (login, create-first-user,
   forgot-password, logout, unauthorized). Unlike `ViewShell`, it does NOT
   render the sidebar trigger / breadcrumb header — those views render before a
   user session exists and have no document context. Payload still wraps these
   routes in its passive `MinimalTemplate` (`.template-minimal__wrap`); the
   `.shadcn-auth-view` marker lets `styles.css` neutralize that wrapper so the
   card centers on a full-height themed background (mirrors the
   `.shadcn-auto-doc-view` chrome-hiding precedent). */

import * as React from 'react'

import { cn } from './utils.js'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card.js'

type AuthShellProps = {
  /** Optional brand row rendered above the card (e.g. app name / logo). */
  brand?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  /** Optional content rendered below the card (e.g. a "back to login" link). */
  footer?: React.ReactNode
  className?: string
}

export function AuthShell({
  brand,
  title,
  description,
  children,
  footer,
  className,
}: AuthShellProps) {
  return (
    <div
      className={cn(
        'twp shadcn-auth-view flex min-h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-background p-6',
        className,
      )}
    >
      {brand ? (
        <div className="flex flex-col items-center gap-2 text-center">{brand}</div>
      ) : null}
      <Card className="w-full max-w-sm">
        {title || description ? (
          <CardHeader>
            {title ? <CardTitle className="text-xl">{title}</CardTitle> : null}
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </CardHeader>
        ) : null}
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
      {footer ? (
        <div className="text-center text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  )
}

'use client'

import * as React from 'react'

import { useAuth, useConfig } from '../internal/payloadAdapter.js'
import { Badge } from 'payload-plugin-shadcn-ui'

/* One-line dismissible banner shown to admins when the plugin declined to
   auto-wrap one or more collections/globals because a required field falls
   outside the doc-form matrix. Reads `config.custom['plugin-shadcn-admin']
   .skippedDocViews` (populated by `shadcnAdminPlugin` at config-build time).
   Dismissal is session-scoped via sessionStorage so a refresh re-surfaces
   the warning until the underlying collection is fixed or removed.

   Why not console.warn only: server logs scroll past in Turbopack dev output
   and are needle-in-haystack in production. The user-visible symptom
   ("collection X uses Payload's default chrome, collection Y uses shadcn")
   is otherwise inexplicable. */

type SkippedDocView = {
  kind: 'collection' | 'global'
  slug: string
  types: string[]
}

const STORAGE_KEY = 'shadcn-admin:skipped-doc-views-dismissed'
const PLUGIN_NAMESPACE = 'plugin-shadcn-admin'

const getSkipped = (configCustom: unknown): SkippedDocView[] => {
  if (!configCustom || typeof configCustom !== 'object') return []
  const ns = (configCustom as Record<string, unknown>)[PLUGIN_NAMESPACE]
  if (!ns || typeof ns !== 'object') return []
  const raw = (ns as Record<string, unknown>).skippedDocViews
  if (!Array.isArray(raw)) return []
  return raw as SkippedDocView[]
}

export function SkippedDocViewsBanner(): React.ReactElement | null {
  const auth = useAuth()
  const config = useConfig()
  const [dismissed, setDismissed] = React.useState(true) // hidden until mount checks storage

  const skipped = React.useMemo(
    () =>
      getSkipped((config as { config?: { custom?: unknown } })?.config?.custom),
    [config],
  )

  // Stable signature of the current skip set; session-dismissal is keyed on it
  // so a NEW skip (e.g. a freshly-added collection) re-shows the banner even
  // if a previous version was dismissed.
  const signature = React.useMemo(
    () => skipped.map((s) => `${s.kind}:${s.slug}:${s.types.join(',')}`).join('|'),
    [skipped],
  )

  React.useEffect(() => {
    if (!skipped.length) {
      setDismissed(true)
      return
    }
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      setDismissed(stored === signature)
    } catch {
      setDismissed(false)
    }
  }, [signature, skipped.length])

  const dismiss = React.useCallback(() => {
    setDismissed(true)
    try {
      sessionStorage.setItem(STORAGE_KEY, signature)
    } catch {
      /* sessionStorage unavailable; banner just hides for this render */
    }
  }, [signature])

  if (dismissed) return null
  if (!skipped.length) return null

  // Admin-only — non-admin users see nothing.
  const user = (auth as { user?: { roles?: unknown } } | null)?.user
  const roles = Array.isArray(user?.roles) ? (user!.roles as unknown[]) : []
  const isAdmin = roles.includes('admin')
  if (!isAdmin) return null

  return (
    <div
      className="twp"
      role="status"
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 9999,
        maxWidth: 480,
      }}
    >
      <div className="bg-card border border-border rounded-md shadow-lg p-3 text-sm space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="font-medium">
            shadcn admin: {skipped.length} doc view
            {skipped.length === 1 ? '' : 's'} skipped
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          One or more {skipped.length === 1 ? 'entity has' : 'entities have'} a
          required field outside the doc-form matrix; Payload's default edit
          view is used instead. Add a per-field{' '}
          <code className="text-foreground">.custom['plugin-shadcn-admin'].input</code>{' '}
          override to render those fields with shadcn.
        </p>
        <div className="flex flex-wrap gap-1">
          {skipped.map((s) => (
            <Badge key={`${s.kind}:${s.slug}`} variant="outline">
              {s.kind}/{s.slug}: {s.types.join(', ')}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

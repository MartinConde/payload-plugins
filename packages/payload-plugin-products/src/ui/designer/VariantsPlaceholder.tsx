'use client'

/* Node-safe shell for the variants-tab placeholder. Value-imports ONLY
   `react`; the inner card (which pulls shadcn-admin / @payloadcms/ui) is
   reached via React.lazy so the Payload CLI's Node config load doesn't try to
   evaluate the CSS-pulling import chain. Mirrors PrintAreaInput / DesignerField. */

import * as React from 'react'

const VariantsPlaceholderInner = React.lazy(() =>
  import('./VariantsPlaceholderInner.js').then((m) => ({
    default: m.VariantsPlaceholderInner,
  })),
)

export function VariantsPlaceholder(): React.ReactElement {
  return (
    <React.Suspense
      fallback={
        <div
          className="h-32 w-full animate-pulse rounded-lg border bg-muted/30"
          aria-busy="true"
        />
      }
    >
      <VariantsPlaceholderInner />
    </React.Suspense>
  )
}

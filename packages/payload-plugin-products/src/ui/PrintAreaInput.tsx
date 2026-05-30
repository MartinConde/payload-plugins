'use client'

/* Node-safe shell for the `printAreas` `.input` override. This file is pulled
   into the Payload Node config graph (it's a direct component reference on the
   field's `custom['plugin-shadcn-admin'].input`), so it MUST value-import ONLY
   `react`. The heavy editor — which imports `fabric` (touches `window` at import
   time), `@payloadcms/ui`, and shadcn primitives — is reached exclusively via the
   lazy `import()` below, which is never evaluated during the Node config load. */

import * as React from 'react'
import type { FieldInputProps } from './adminTypes.js'

const PrintAreaEditor = React.lazy(() =>
  import('./editor/PrintAreaEditor.js').then((m) => ({ default: m.PrintAreaEditor })),
)

export function PrintAreaInput(props: FieldInputProps): React.ReactElement {
  return (
    <React.Suspense
      fallback={
        <div
          className="h-96 w-full animate-pulse rounded-lg border bg-muted/30"
          aria-busy="true"
          aria-label="Loading print-area editor…"
        />
      }
    >
      <PrintAreaEditor {...props} />
    </React.Suspense>
  )
}

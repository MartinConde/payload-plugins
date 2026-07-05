'use client'

/* Node-safe shell for the gallery field's `.input` override. `galleryField()`
   (src/fields/galleryField.ts) is exported from this package's root — and
   THAT function value-imports this file directly and stashes it in
   `custom['plugin-shadcn-admin'].input`, so this module is pulled into the
   Payload server config graph and loaded by the Payload CLI in plain Node
   the moment a consumer imports `galleryField` (or even just
   `shadcnAdminPlugin`, since ES modules fully evaluate a package's own
   `export … from` statements regardless of which export the importer
   actually uses — see payload.config.ts's `payload migrate:*` crash this
   was written to fix).

   THEREFORE this file must stay Node-safe: it value-imports ONLY `react` and
   uses `import type` for the prop contract. The real implementation (dnd-kit,
   shadcn primitives, `useTranslation` via payloadAdapterUI.js — all of which
   transitively pull `@payloadcms/ui` / CSS that crash Node) lives in
   `GalleryArrayInputInner.tsx` and is loaded via `React.lazy(() =>
   import(...))`. The dynamic `import()` is never evaluated during config
   load, so none of that reaches Node — only the browser, where this client
   component actually runs. Same pattern as payload-plugin-menus's
   `MenuTreeInput.tsx` and payload-plugin-products's `DesignerField.tsx`. */

import * as React from 'react'

import type { FieldInputProps } from '../inputs/FieldInput.js'

const GalleryArrayInputInner = React.lazy(() =>
  import('./GalleryArrayInputInner.js').then((m) => ({
    default: m.GalleryArrayInputInner,
  })),
)

export function GalleryArrayInput(props: FieldInputProps): React.ReactElement {
  return (
    <React.Suspense
      fallback={
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          aria-busy="true"
          aria-label="Loading gallery…"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-md border bg-muted/30"
            />
          ))}
        </div>
      }
    >
      <GalleryArrayInputInner {...props} />
    </React.Suspense>
  )
}

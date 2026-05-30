'use client'

/* Launch card for the SEO setup wizard, mounted on the `seo-settings` global
   via shadcn-admin's group-level `.input` override (same mechanism as
   SeoGroupInput). Because it's a DIRECT component reference in the global
   config, its import graph is loaded by the Payload CLI in plain Node — so this
   file must stay Node-safe: NO value imports from
   `payload-plugin-shadcn-admin/client` (its barrel → @payloadcms/ui → CSS
   imports that crash Node). Types are `import type` (erased); the link is a
   plain anchor + lucide icon + theme-token classes. */

import * as React from 'react'
import { Wand2, ArrowRight } from 'lucide-react'

import type { TFunction } from '@payloadcms/translations'
import type { FieldInputProps } from './adminTypes.js'
import type { SeoTranslationsKeys } from '../translations.js'

const tr = (
  t: FieldInputProps['t'],
  key: SeoTranslationsKeys,
  fallback: string,
): string => {
  const tt = t as TFunction<SeoTranslationsKeys> | undefined
  return tt ? tt(key) : fallback
}

/** The override receives the full FieldInputProps; this presentational launcher
   only reads `t`. The hosting group carries no data (a single `ui` child), so
   there's nothing to render or write. */
export function SeoWizardLaunch({ t }: FieldInputProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Wand2 className="size-5" />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {tr(t, 'pluginSeo:launchTitle', 'SEO setup wizard')}
          </p>
          <p className="text-sm text-muted-foreground">
            {tr(
              t,
              'pluginSeo:launchDesc',
              'Walk through your site-wide SEO essentials step by step.',
            )}
          </p>
        </div>
      </div>
      <a
        href="/admin/seo-wizard"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {tr(t, 'pluginSeo:launchCta', 'Open setup wizard')}
        <ArrowRight className="size-4" />
      </a>
    </div>
  )
}

'use client'

import * as React from 'react'
import { PaletteIcon } from 'lucide-react'
import { Card, CardContent } from 'payload-plugin-shadcn-ui'
import { useTranslation } from '@payloadcms/ui'

/* Rendered in place of the canvas when the product has no colors yet.
   Points the admin at the General tab's `colors` relationship — that's
   where colors get created via Payload's allowCreate drawer, the chip
   strip's "+ Add color" only adds EXISTING swatches. */
export function NoColorsEmptyState(): React.ReactElement {
  const { t } = useTranslation()
  const tr = (k: string): string => (t as (k: string) => string)(k)
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
        <PaletteIcon className="size-6" />
        <p className="max-w-sm text-sm">{tr('pluginProducts:noColorsHint')}</p>
      </CardContent>
    </Card>
  )
}

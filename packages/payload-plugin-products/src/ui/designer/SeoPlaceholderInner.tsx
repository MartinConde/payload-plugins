'use client'

/* Browser-only inner of SeoPlaceholder. */

import * as React from 'react'
import { Card, CardContent } from 'payload-plugin-shadcn-ui'
import { useTranslation } from '@payloadcms/ui'

export function SeoPlaceholderInner(): React.ReactElement {
  const { t } = useTranslation()
  const tr = (k: string): string => (t as (k: string) => string)(k)
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {tr('pluginProducts:seoConfiguredSeparately')}
      </CardContent>
    </Card>
  )
}

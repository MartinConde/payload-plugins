'use client'

/* Browser-only inner of VariantsPlaceholder. Reached via React.lazy so its
   @payloadcms/ui / shadcn-admin value imports never hit the Payload CLI's
   Node config load. */

import * as React from 'react'
import { Card, CardContent } from 'payload-plugin-shadcn-ui'
import { useTranslation } from '@payloadcms/ui'

export function VariantsPlaceholderInner(): React.ReactElement {
  const { t } = useTranslation()
  const tr = (k: string): string => (t as (k: string) => string)(k)
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {tr('pluginProducts:variantsComingSoon')}
      </CardContent>
    </Card>
  )
}

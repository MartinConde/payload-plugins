'use client'

/* "+ Create new template" affordance for the view-level print-area picker.
   Mirrors InlineCreateColor — opens a Payload DocumentDrawer against
   `print-templates`, and fires `onCreated(id)` once the new doc is saved. */

import * as React from 'react'
import { PlusIcon } from 'lucide-react'
import { useDocumentDrawer, useTranslation } from '@payloadcms/ui'

export type InlineCreateTemplateProps = {
  printTemplatesSlug: string
  onCreated: (id: string) => void
  disabled?: boolean
}

export function InlineCreateTemplate({
  printTemplatesSlug,
  onCreated,
  disabled,
}: InlineCreateTemplateProps): React.ReactElement {
  const { t } = useTranslation()
  const tr = (k: string): string => (t as (k: string) => string)(k)
  const [Drawer, Toggler] = useDocumentDrawer({ collectionSlug: printTemplatesSlug })

  return (
    <>
      <Toggler
        disabled={disabled}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        <PlusIcon className="size-3.5" aria-hidden />
        {tr('pluginProducts:createNewTemplate')}
      </Toggler>
      <Drawer
        onSave={({ doc, operation }) => {
          if (operation !== 'create') return
          const id = (doc as { id?: string | number } | null)?.id
          if (id != null) onCreated(String(id))
        }}
      />
    </>
  )
}

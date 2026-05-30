'use client'

/* v3.8 — locale switcher for the auto doc form.
   Renders a shadcn Select scoped to the configured locales. On change, the
   bridge swaps active-locale state and triggers a single getFormState
   rebuild for richText editors. No router push — unsaved edits in other
   locales remain in client state. */

import * as React from 'react'
import { GlobeIcon } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'

/** Serializable Locale shape carried RSC→Client. Mirrors a subset of
 *  Payload's own `Locale` type — only what the dropdown needs. */
export type ExtractedLocale = {
  code: string
  label: string
  rtl?: boolean
}

export type LocaleSwitcherProps = {
  locales: ExtractedLocale[]
  activeLocale: string
  onChange: (code: string) => void
  disabled?: boolean
}

export function LocaleSwitcher({
  locales,
  activeLocale,
  onChange,
  disabled,
}: LocaleSwitcherProps): React.ReactElement | null {
  if (!locales || locales.length <= 1) return null
  return (
    <div className="flex items-center gap-1.5">
      <GlobeIcon className="size-3.5 text-muted-foreground" />
      <Select
        value={activeLocale}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-32" data-testid="locale-switcher">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map((loc) => (
            <SelectItem key={loc.code} value={loc.code}>
              {loc.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

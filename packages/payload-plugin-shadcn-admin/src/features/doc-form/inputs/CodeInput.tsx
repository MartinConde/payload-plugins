'use client'

/* Code field input. Payload stores code as a plain string; admin.language
   controls editor highlighting in the stock admin but is informational only
   here (we render a monospace textarea — no syntax highlighting in v2). */

import * as React from 'react'

import { Textarea } from 'payload-plugin-shadcn-ui'

export type CodeInputProps = {
  id?: string
  value: unknown
  language?: string
  onChange: (next: string) => void
  required?: boolean
  invalid?: boolean
  disabled?: boolean
}

export function CodeInput({
  id,
  value,
  language,
  onChange,
  required,
  invalid,
  disabled,
}: CodeInputProps): React.ReactElement {
  const stringVal = typeof value === 'string' ? value : ''
  return (
    <div className="flex flex-col gap-1">
      <Textarea
        id={id}
        value={stringVal}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        spellCheck={false}
        required={required}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        className="font-mono text-xs leading-relaxed aria-invalid:border-destructive aria-invalid:ring-destructive/40"
      />
      {language ? (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {language}
        </span>
      ) : null}
    </div>
  )
}

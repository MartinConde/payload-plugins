'use client'

/* JSON field input. Payload's REST endpoint expects a parsed JSON value on
   the wire (NOT a JSON-encoded string), so this input parses on every keystroke
   and emits one of:
     - the parsed value (object/array/scalar/null) when the text parses cleanly
     - a JSON_PARSE_ERROR marker object when it doesn't — the form bridge
       detects the marker on submit, blocks the request, and surfaces the
       parse error inline at the field's path.
   The marker is checked by the bridge via isJsonParseError() before it builds
   the PATCH/POST body, so the marker never reaches the wire. */

import * as React from 'react'

import { Textarea } from 'payload-plugin-shadcn-ui'

export const JSON_PARSE_ERROR_KEY = '__jsonParseError__'

export type JsonParseErrorMarker = {
  [JSON_PARSE_ERROR_KEY]: string
  raw: string
}

export const isJsonParseError = (v: unknown): v is JsonParseErrorMarker =>
  typeof v === 'object' &&
  v !== null &&
  JSON_PARSE_ERROR_KEY in (v as Record<string, unknown>)

const stringify = (v: unknown): string => {
  if (v === undefined) return ''
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return ''
  }
}

export type JsonInputProps = {
  id?: string
  value: unknown
  onChange: (next: unknown) => void
  required?: boolean
  invalid?: boolean
  disabled?: boolean
}

export function JsonInput({
  id,
  value,
  onChange,
  required,
  invalid,
  disabled,
}: JsonInputProps): React.ReactElement {
  // Track the raw text separately so the user can type partially-invalid JSON
  // without losing their cursor or the last good parse echoing back.
  const [text, setText] = React.useState<string>(() =>
    isJsonParseError(value) ? value.raw : stringify(value),
  )
  const [parseError, setParseError] = React.useState<string | null>(
    isJsonParseError(value) ? value[JSON_PARSE_ERROR_KEY] : null,
  )

  // Re-baseline when the parent value changes (e.g. server-side initial values
  // or a Discard reset). Skip when the parent value IS the marker we just
  // emitted, to avoid clobbering the user's in-progress text.
  const initialRef = React.useRef<unknown>(value)
  React.useEffect(() => {
    if (value === initialRef.current) return
    initialRef.current = value
    if (isJsonParseError(value)) {
      setText(value.raw)
      setParseError(value[JSON_PARSE_ERROR_KEY])
    } else {
      setText(stringify(value))
      setParseError(null)
    }
  }, [value])

  const handleChange = (next: string) => {
    setText(next)
    if (next.trim() === '') {
      setParseError(null)
      onChange(null)
      initialRef.current = null
      return
    }
    try {
      const parsed = JSON.parse(next)
      setParseError(null)
      onChange(parsed)
      initialRef.current = parsed
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON'
      setParseError(message)
      const marker: JsonParseErrorMarker = {
        [JSON_PARSE_ERROR_KEY]: message,
        raw: next,
      }
      onChange(marker)
      initialRef.current = marker
    }
  }

  const showInvalid = invalid || parseError !== null

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        id={id}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={6}
        spellCheck={false}
        required={required}
        disabled={disabled}
        aria-invalid={showInvalid ? true : undefined}
        className="font-mono text-xs leading-relaxed aria-invalid:border-destructive aria-invalid:ring-destructive/40"
      />
      {parseError ? (
        <p className="text-xs text-destructive">JSON: {parseError}</p>
      ) : null}
    </div>
  )
}

/* Pure CSV serialization helpers. No React. Used by ExportMenu to
   project an arbitrary array of Payload docs into a downloadable CSV. */

import type { FieldMeta } from '../columns/fieldPicker.js'

const CSV_NEEDS_QUOTE_RE = /[",\r\n]/

export const csvEscape = (value: string): string => {
  if (!CSV_NEEDS_QUOTE_RE.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

/* Coerce a single field value to a CSV cell string. Strategy:
   - null/undefined → ''
   - string/number/bigint → String()
   - boolean → 'true' / 'false'
   - Date instance or ISO-shaped string → ISO string
   - Anything else (arrays, objects, relationship objects, polymorphic
     { relationTo, value } shapes, blocks, groups, richText nodes) →
     JSON.stringify(). Lossless and predictable. */
export const coerceCellValue = (_field: FieldMeta | undefined, raw: unknown): string => {
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number' || typeof raw === 'bigint') return String(raw)
  if (typeof raw === 'boolean') return raw ? 'true' : 'false'
  if (raw instanceof Date) return raw.toISOString()
  try {
    return JSON.stringify(raw)
  } catch {
    return String(raw)
  }
}

/* BOM-prefixed so Excel opens UTF-8 cleanly. CRLF line endings per RFC 4180. */
export const rowsToCsv = (headers: string[], rows: string[][]): string => {
  const lines: string[] = []
  lines.push(headers.map(csvEscape).join(','))
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','))
  }
  return '﻿' + lines.join('\r\n') + '\r\n'
}

export const downloadCsv = (filename: string, text: string): void => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke async so the click has a tick to dispatch.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

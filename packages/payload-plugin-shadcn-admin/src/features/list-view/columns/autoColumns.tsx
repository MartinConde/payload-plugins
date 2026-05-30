'use client'

import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { Check } from 'lucide-react'
import * as React from 'react'

import { DataTableColumnHeader } from '../data-table/DataTableColumnHeader.js'
import { pickFieldNames, type CollectionMeta, type FieldMeta } from './fieldPicker.js'

/* The auto-columns builder reads only a small structural subset of Payload's
   SanitizedCollectionConfig so callers don't need to import Payload's full type
   into a 'use client' module. Payload's real (stricter) types remain assignable. */
type AutoField = FieldMeta & {
  options?: ReadonlyArray<
    string | { label?: unknown; value: string | number }
  >
  /** array-field labels — used by the auto cell to render
   *  "{N} {singular|plural}" when set. */
  labels?: { singular?: string | null; plural?: string | null } | null
  admin?: {
    hidden?: boolean
    disableListColumn?: boolean
    date?: { displayFormat?: string }
    [k: string]: unknown
  } | null
  custom?: Record<string, any> | null
}

type AutoCollection = CollectionMeta & {
  fields: ReadonlyArray<AutoField>
}

const PLUGIN_NAMESPACE = 'plugin-shadcn-admin'
const EM_DASH = '—'

const stringifyLabel = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (typeof v === 'string') return v
    }
  }
  return null
}

const titleCase = (name: string): string =>
  name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

const labelFor = (field: AutoField, fallback: string): string =>
  stringifyLabel(field.label) ?? titleCase(field.name ?? fallback)

const truncate = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n - 1) + '…' : s

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === ''

const formatDate = (value: unknown, displayFormat?: string): string => {
  if (isEmpty(value)) return EM_DASH
  const d = new Date(value as string | number | Date)
  if (Number.isNaN(d.getTime())) return EM_DASH
  // displayFormat is a date-fns token string; we don't ship date-fns, so we
  // ignore the token and use the locale-aware short format as documented.
  // Consumers who need full format control should ship their own list view.
  void displayFormat
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatNumber = (value: unknown): string => {
  if (isEmpty(value)) return EM_DASH
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return new Intl.NumberFormat().format(n)
}

const optionLabel = (
  options: AutoField['options'],
  value: unknown,
): string => {
  if (isEmpty(value)) return EM_DASH
  if (!options) return String(value)
  for (const opt of options) {
    if (typeof opt === 'string') {
      if (opt === value) return opt
    } else if (opt.value === value) {
      return stringifyLabel(opt.label) ?? String(opt.value)
    }
  }
  return String(value)
}

const relatedTitle = (
  related: unknown,
  useAsTitle: string | undefined,
): string => {
  if (isEmpty(related)) return EM_DASH
  if (typeof related !== 'object') return String(related)
  const obj = related as Record<string, unknown>
  if (useAsTitle && !isEmpty(obj[useAsTitle])) return String(obj[useAsTitle])
  if (!isEmpty(obj.id)) return String(obj.id)
  return EM_DASH
}

/* Walk a Lexical AST (`{ root: { children: [...] } }`) or a Slate-style
   array of nodes, collecting text. Defensive against arbitrary shapes. */
const extractLexicalText = (value: unknown, maxChars: number): string => {
  const parts: string[] = []
  let budget = maxChars * 4 // bail early on huge docs
  const visit = (node: unknown): void => {
    if (budget <= 0) return
    if (node == null) return
    if (typeof node === 'string') {
      parts.push(node)
      budget -= node.length
      return
    }
    if (Array.isArray(node)) {
      for (const child of node) {
        if (budget <= 0) break
        visit(child)
      }
      return
    }
    if (typeof node !== 'object') return
    const obj = node as Record<string, unknown>
    if (typeof obj.text === 'string') {
      parts.push(obj.text)
      budget -= obj.text.length
    }
    if (obj.children) visit(obj.children)
    if (obj.root) visit(obj.root)
  }
  try {
    visit(value)
  } catch {
    return ''
  }
  const joined = parts.join(' ').replace(/\s+/g, ' ').trim()
  return truncate(joined, maxChars)
}

const summarizeArray = (value: unknown, field: AutoField): string => {
  if (!Array.isArray(value)) return EM_DASH
  const n = value.length
  const singular = stringifyLabel(field.labels?.singular) ?? 'item'
  const plural = stringifyLabel(field.labels?.plural) ?? 'items'
  return `${n} ${n === 1 ? singular : plural}`
}

const summarizeBlocks = (value: unknown): string => {
  if (!Array.isArray(value)) return EM_DASH
  const n = value.length
  const seen = new Set<string>()
  const slugs: string[] = []
  for (const item of value) {
    if (item && typeof item === 'object') {
      const slug = (item as Record<string, unknown>).blockType
      if (typeof slug === 'string' && !seen.has(slug)) {
        seen.add(slug)
        slugs.push(slug)
      }
    }
  }
  if (slugs.length === 0) return `${n} blocks`
  return `${n} blocks (${truncate(slugs.join(', '), 40)})`
}

const SCALAR_PREFERRED_KEYS = ['title', 'name', 'label'] as const

const isScalar = (v: unknown): boolean =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'

const summarizeGroup = (value: unknown): string => {
  if (value == null || typeof value !== 'object' || Array.isArray(value))
    return EM_DASH
  const obj = value as Record<string, unknown>
  for (const key of SCALAR_PREFERRED_KEYS) {
    const v = obj[key]
    if (isScalar(v) && !isEmpty(v)) return String(v)
  }
  for (const v of Object.values(obj)) {
    if (isScalar(v) && !isEmpty(v)) return String(v)
  }
  return EM_DASH
}

const formatPoint = (value: unknown): string => {
  if (!Array.isArray(value) || value.length !== 2) return EM_DASH
  const lng = Number(value[0])
  const lat = Number(value[1])
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return EM_DASH
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

const TypeBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
    {children}
  </span>
)

/* Cell renderer for a single Payload field type. Receives the raw row value
   and returns a React node. Falls back to em-dash for null/undefined. */
const renderCellForField = (
  field: AutoField,
  value: unknown,
  context: {
    isUseAsTitle: boolean
    useAsTitleBySlug?: Record<string, string | undefined>
  },
): React.ReactNode => {
  if (isEmpty(value) && field.type !== 'checkbox') return EM_DASH

  switch (field.type) {
    case 'text':
    case 'email':
      return context.isUseAsTitle ? (
        <span className="font-medium">{String(value)}</span>
      ) : (
        <span>{String(value)}</span>
      )

    case 'textarea':
      return (
        <span className="text-muted-foreground">
          {truncate(String(value), 80)}
        </span>
      )

    case 'number':
      return <span>{formatNumber(value)}</span>

    case 'date':
      return (
        <span className="text-muted-foreground">
          {formatDate(value, field.admin?.date?.displayFormat)}
        </span>
      )

    case 'checkbox':
      return value ? (
        <Check className="h-4 w-4" aria-label="true" />
      ) : (
        <span className="sr-only">false</span>
      )

    case 'select':
    case 'radio': {
      if (field.hasMany && Array.isArray(value)) {
        if (value.length === 0) return EM_DASH
        return (
          <span>
            {value.map((v) => optionLabel(field.options, v)).join(', ')}
          </span>
        )
      }
      return <span>{optionLabel(field.options, value)}</span>
    }

    case 'relationship': {
      if (Array.isArray(field.relationTo)) {
        const renderOne = (v: unknown): React.ReactNode => {
          if (v == null || typeof v !== 'object') return null
          const entry = v as { relationTo?: unknown; value?: unknown }
          const slug =
            typeof entry.relationTo === 'string' ? entry.relationTo : undefined
          const doc = entry.value
          const useAsTitle = slug
            ? context.useAsTitleBySlug?.[slug]
            : undefined
          const title = relatedTitle(doc, useAsTitle)
          return (
            <span className="inline-flex items-center gap-1">
              {slug ? <TypeBadge>{slug}</TypeBadge> : null}
              <span>{title}</span>
            </span>
          )
        }
        if (field.hasMany && Array.isArray(value)) {
          if (value.length === 0) return EM_DASH
          const shown = value.slice(0, 2).map(renderOne)
          const more = value.length - shown.length
          return (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {shown.map((node, i) => (
                <React.Fragment key={i}>{node}</React.Fragment>
              ))}
              {more > 0 ? (
                <span className="text-muted-foreground">+{more} more</span>
              ) : null}
            </span>
          )
        }
        return renderOne(value) ?? EM_DASH
      }
      const relatedSlug = field.relationTo
      const useAsTitle = relatedSlug
        ? context.useAsTitleBySlug?.[relatedSlug]
        : undefined
      if (field.hasMany && Array.isArray(value)) {
        if (value.length === 0) return EM_DASH
        const titles = value
          .slice(0, 2)
          .map((v) => relatedTitle(v, useAsTitle))
        const more = value.length - titles.length
        return (
          <span>
            {titles.join(', ')}
            {more > 0 ? ` +${more} more` : ''}
          </span>
        )
      }
      return <span>{relatedTitle(value, useAsTitle)}</span>
    }

    case 'upload': {
      if (Array.isArray(field.relationTo)) {
        return <em className="text-muted-foreground">polymorphic upload</em>
      }
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>
        const url = (obj.thumbnailURL ?? obj.url) as string | undefined
        const alt = (obj.alt as string | undefined) ?? ''
        const filename = (obj.filename as string | undefined) ?? ''
        const mimeType = (obj.mimeType as string | undefined) ?? ''
        if (url && mimeType.startsWith('image/')) {
          // eslint-disable-next-line @next/next/no-img-element
          return (
            <img
              src={url}
              alt={alt || filename}
              className="h-8 w-8 rounded object-cover"
            />
          )
        }
        return <span>{filename || String(obj.id ?? EM_DASH)}</span>
      }
      return <span>{String(value)}</span>
    }

    case 'code':
      return (
        <code className="text-muted-foreground text-xs">
          {truncate(String(value), 40)}
        </code>
      )

    case 'json':
      try {
        return (
          <code className="text-muted-foreground text-xs">
            {truncate(JSON.stringify(value), 60)}
          </code>
        )
      } catch {
        return EM_DASH
      }

    case 'richText': {
      const text = extractLexicalText(value, 60)
      if (!text) return EM_DASH
      return <span className="text-muted-foreground">{text}</span>
    }

    case 'array': {
      if (!Array.isArray(value) || value.length === 0) return EM_DASH
      return <span>{summarizeArray(value, field)}</span>
    }

    case 'blocks': {
      if (!Array.isArray(value) || value.length === 0) return EM_DASH
      return <span>{summarizeBlocks(value)}</span>
    }

    case 'group':
    case 'tab':
    case 'tabs': {
      const s = summarizeGroup(value)
      if (s === EM_DASH) return EM_DASH
      return <span>{s}</span>
    }

    case 'point': {
      const s = formatPoint(value)
      if (s === EM_DASH) return EM_DASH
      return <span className="text-muted-foreground tabular-nums">{s}</span>
    }

    default:
      return <em className="text-muted-foreground">{field.type}</em>
  }
}

const SORTABLE_TYPES = new Set([
  'text',
  'textarea',
  'email',
  'number',
  'date',
  'checkbox',
  'radio',
  'select',
])

const isSortable = (field: AutoField): boolean => {
  if (field.hasMany) return false
  return SORTABLE_TYPES.has(field.type)
}

/* Synthetic "fields" for id / createdAt / updatedAt — Payload doesn't list
   these in collection.fields but they're always present on the row. */
const SYNTHETIC_FIELDS: Record<string, AutoField> = {
  id: { type: 'text', name: 'id', label: 'ID' },
  createdAt: { type: 'date', name: 'createdAt', label: 'Created' },
  updatedAt: { type: 'date', name: 'updatedAt', label: 'Updated' },
}

const isExcluded = (field: AutoField): boolean =>
  Boolean(field.hidden || field.admin?.hidden || field.admin?.disableListColumn)

const findField = (
  collection: AutoCollection,
  name: string,
): AutoField | undefined => {
  if (SYNTHETIC_FIELDS[name]) return SYNTHETIC_FIELDS[name]
  return collection.fields.find((f) => f.name === name)
}

export type BuildColumnsOptions = {
  collection: AutoCollection
  /** Map of related-collection slug → its useAsTitle, used by relationship
   *  cells to render the related doc's title. Passed as a plain object so it
   *  survives RSC→Client serialization. */
  useAsTitleBySlug?: Record<string, string | undefined>
  /** v3.20 — column field names that carry a native `admin.components.Cell`.
   *  Their cells are pre-rendered server-side (see `renderNativeCells`). */
  nativeCellFieldNames?: ReadonlyArray<string>
  /** v3.20 — `[rowId][fieldName]` → server-rendered native cell node. */
  nativeCellsByRow?: Record<string, Record<string, React.ReactNode>>
}

export function buildColumnsForCollection({
  collection,
  useAsTitleBySlug,
  nativeCellFieldNames,
  nativeCellsByRow,
}: BuildColumnsOptions): ColumnDef<any, any>[] {
  const useAsTitle = collection.admin?.useAsTitle
  const names = pickFieldNames(collection)
  const columns: ColumnDef<any, any>[] = []

  for (const name of names) {
    const field = findField(collection, name)
    if (!field) continue
    if (isExcluded(field)) continue

    const title = labelFor(field, name)
    const sortable = isSortable(field)

    // Cell resolution order (v3.20): (1) plugin escape hatch
    // `field.custom['plugin-shadcn-admin'].cell` — a client-ref function, takes
    // priority and is the recommended path for context-dependent Cells; (2) a
    // Payload-native `field.admin.components.Cell`, pre-rendered server-side and
    // looked up per row from `nativeCellsByRow`; (3) the built-in renderer.
    const override = field.custom?.[PLUGIN_NAMESPACE]?.cell as
      | ColumnDef<any, any>['cell']
      | undefined

    const hasNativeCell = Boolean(
      !override && nativeCellFieldNames?.includes(name),
    )

    const fallbackCell = (ctx: CellContext<any, unknown>) =>
      renderCellForField(field, ctx.getValue(), {
        isUseAsTitle: name === useAsTitle,
        useAsTitleBySlug,
      })

    const cell =
      override ??
      (hasNativeCell
        ? (ctx: CellContext<any, unknown>) => {
            const rowId = (ctx.row.original as { id?: unknown })?.id
            const node = nativeCellsByRow?.[String(rowId)]?.[name]
            // Fall back if a row has no pre-rendered node (e.g. id missing).
            return node !== undefined ? node : fallbackCell(ctx)
          }
        : fallbackCell)

    columns.push({
      accessorKey: name,
      header: sortable
        ? ({ column }) => (
            <DataTableColumnHeader column={column} title={title} />
          )
        : () => <span className="text-xs font-medium">{title}</span>,
      cell,
      enableSorting: sortable,
    })
  }

  return columns
}


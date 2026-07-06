'use client'

/* Built-in cell renderer for a single Payload field type — the fallback used
   by buildColumnsForCollection when a field has no `.cell` override or
   pre-rendered native cell. Split out of autoColumns.tsx, which owns column
   assembly; this owns per-field-type rendering. */

import * as React from 'react'
import { Check } from 'lucide-react'
import type { AutoField } from './autoColumns.js'
import {
  EM_DASH,
  extractLexicalText,
  formatDate,
  formatNumber,
  formatPoint,
  isEmpty,
  optionLabel,
  relatedTitle,
  summarizeArray,
  summarizeBlocks,
  summarizeGroup,
  truncate,
} from './cellFormatters.js'

const TypeBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
    {children}
  </span>
)

/* Cell renderer for a single Payload field type. Receives the raw row value
   and returns a React node. Falls back to em-dash for null/undefined. */
export const renderCellForField = (
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

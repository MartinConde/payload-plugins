'use client'

/* Per-field-type value input rendered inside the chip editor popover.
   Operator is chosen separately; this component only renders the value
   control appropriate to (field.type, operator). */

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { useTranslation } from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Button } from 'payload-plugin-shadcn-ui'
import { Calendar } from 'payload-plugin-shadcn-ui'
import { Checkbox } from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'payload-plugin-shadcn-ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'
import type { FieldMeta } from '../columns/fieldPicker.js'
import {
  operatorsForField,
  type FilterValue,
  type WhereOperator,
} from './filterCodec.js'
import { RelationshipPicker } from '../../../shared/RelationshipPicker.js'

type Props = {
  field: FieldMeta
  operator: WhereOperator
  value: FilterValue
  useAsTitleBySlug?: Record<string, string | undefined>
  onChange: (value: FilterValue) => void
}

const stringifyValue = (value: FilterValue): string => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(',')
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

const formatDateLabel = (value: FilterValue, placeholder: string): string => {
  const s = typeof value === 'string' ? value : ''
  if (!s) return placeholder
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

const toISODate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const fieldOptions = (
  field: FieldMeta,
): Array<{ value: string; label: string }> => {
  const opts = (field as { options?: unknown }).options
  if (!Array.isArray(opts)) return []
  return opts.map((opt: unknown) => {
    if (typeof opt === 'string') return { value: opt, label: opt }
    if (opt && typeof opt === 'object') {
      const o = opt as { value: string | number; label?: unknown }
      const label = typeof o.label === 'string' ? o.label : String(o.value)
      return { value: String(o.value), label }
    }
    return { value: String(opt), label: String(opt) }
  })
}

export function FilterValueInput({
  field,
  operator,
  value,
  useAsTitleBySlug,
  onChange,
}: Props): React.ReactElement | null {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const opDesc = operatorsForField(field).find((o) => o.value === operator)

  if (opDesc?.noValue) return null

  // Relationship
  if (field.type === 'relationship' && !Array.isArray(field.relationTo)) {
    const relatedSlug = field.relationTo as string
    return (
      <RelationshipPicker
        relatedSlug={relatedSlug}
        useAsTitle={useAsTitleBySlug?.[relatedSlug]}
        multi={Boolean(opDesc?.multi)}
        value={
          Array.isArray(value)
            ? value
            : typeof value === 'string'
              ? value
              : null
        }
        onChange={(v) => onChange(v as FilterValue)}
      />
    )
  }

  // Multi (in / not_in) for select/radio
  if (opDesc?.multi && (field.type === 'select' || field.type === 'radio')) {
    const opts = fieldOptions(field)
    const selected = Array.isArray(value) ? value.map(String) : []
    return (
      <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
        {opts.length === 0 && (
          <span className="text-sm text-muted-foreground">No options</span>
        )}
        {opts.map((opt) => {
          const checked = selected.includes(opt.value)
          return (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(c) => {
                  if (c) onChange([...selected, opt.value])
                  else onChange(selected.filter((v) => v !== opt.value))
                }}
              />
              <span>{opt.label}</span>
            </label>
          )
        })}
      </div>
    )
  }

  // Single select / radio
  if (field.type === 'select' || field.type === 'radio') {
    const opts = fieldOptions(field)
    return (
      <Select
        value={typeof value === 'string' ? value : ''}
        onValueChange={(v) => onChange(v)}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder={t('general:selectValue')} />
        </SelectTrigger>
        <SelectContent>
          {opts.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // Checkbox
  if (field.type === 'checkbox') {
    return (
      <Select
        value={value === true || value === 'true' ? 'true' : 'false'}
        onValueChange={(v) => onChange(v === 'true')}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">checked</SelectItem>
          <SelectItem value="false">unchecked</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  // Date
  if (field.type === 'date' || field.name === 'createdAt' || field.name === 'updatedAt') {
    const selected =
      typeof value === 'string' && value
        ? (() => {
            const d = new Date(value)
            return Number.isNaN(d.getTime()) ? undefined : d
          })()
        : undefined
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start font-normal"
          >
            <CalendarIcon className="mr-2 size-4" />
            {formatDateLabel(value, t('shadcnAdmin:pickDate'))}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => onChange(d ? toISODate(d) : null)}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    )
  }

  // Number
  if (field.type === 'number') {
    return (
      <Input
        type="number"
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8"
      />
    )
  }

  // Synthetic `id`: text or array (for `in`)
  if (field.name === 'id') {
    if (opDesc?.multi) {
      return (
        <Input
          placeholder="IDs (comma-separated)"
          value={Array.isArray(value) ? value.join(',') : ''}
          onChange={(e) => {
            const parts = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            onChange(parts)
          }}
          className="h-8"
        />
      )
    }
    return (
      <Input
        placeholder="ID"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8"
      />
    )
  }

  // Default: text / email / textarea
  return (
    <Input
      value={stringifyValue(value)}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-8"
      autoFocus
    />
  )
}

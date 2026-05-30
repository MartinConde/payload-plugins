'use client'

/* Polymorphic relationship input. Payload stores polymorphic relationships
   as { value, relationTo } (single) or [{ value, relationTo }] (hasMany), and
   accepts the same shape on REST. This component wraps the existing
   RelationshipPicker (which only handles a single relationTo at a time) by
   first asking the user to pick a slug, then mounting RelationshipPicker for
   that slug. */

import * as React from 'react'
import { XIcon } from 'lucide-react'

import { Badge } from 'payload-plugin-shadcn-ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'
import { RelationshipPicker } from '../../../shared/RelationshipPicker.js'

export type PolyValue = { value: string | number; relationTo: string }

export type PolymorphicRelationshipInputProps = {
  id?: string
  relationTo: string[]
  hasMany?: boolean
  useAsTitleBySlug: Record<string, string | undefined>
  value: unknown
  onChange: (next: PolyValue | PolyValue[] | null) => void
  invalid?: boolean
  disabled?: boolean
}

const normalizeIncoming = (v: unknown): PolyValue[] => {
  if (v === null || v === undefined) return []
  const arr = Array.isArray(v) ? v : [v]
  const out: PolyValue[] = []
  for (const item of arr) {
    if (item && typeof item === 'object') {
      const entry = item as { value?: unknown; relationTo?: unknown }
      if (
        (typeof entry.value === 'string' || typeof entry.value === 'number') &&
        typeof entry.relationTo === 'string'
      ) {
        out.push({ value: entry.value, relationTo: entry.relationTo })
      }
    }
  }
  return out
}

export function PolymorphicRelationshipInput({
  id,
  relationTo,
  hasMany,
  useAsTitleBySlug,
  value,
  onChange,
  invalid,
  disabled,
}: PolymorphicRelationshipInputProps): React.ReactElement {
  const entries = React.useMemo(() => normalizeIncoming(value), [value])
  const [slug, setSlug] = React.useState<string>(
    entries[0]?.relationTo ?? relationTo[0] ?? '',
  )

  const handlePick = (picked: string | string[] | null) => {
    const pickedId = Array.isArray(picked) ? picked[0] : picked
    if (!pickedId || !slug) return
    const next: PolyValue = { value: pickedId, relationTo: slug }
    if (!hasMany) {
      onChange(next)
      return
    }
    const exists = entries.some(
      (e) => String(e.value) === String(next.value) && e.relationTo === slug,
    )
    if (exists) return
    onChange([...entries, next])
  }

  const removeEntry = (target: PolyValue) => {
    if (!hasMany) {
      onChange(null)
      return
    }
    onChange(
      entries.filter(
        (e) =>
          !(String(e.value) === String(target.value) && e.relationTo === target.relationTo),
      ),
    )
  }

  // For single (hasMany=false), the current pick is the value passed down to
  // the inner picker so the chip shows up there. For hasMany, we render our
  // own badge list above the picker and pass null to the inner picker so each
  // pick acts as an "add" action.
  const innerValue: string | null =
    !hasMany && entries[0]?.relationTo === slug ? String(entries[0].value) : null

  return (
    <div className="flex flex-col gap-2">
      {hasMany && entries.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {entries.map((e) => (
            <Badge
              key={`${e.relationTo}:${e.value}`}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-[10px] uppercase tracking-wide opacity-70">
                {e.relationTo}
              </span>
              <span className="max-w-[10rem] truncate">{String(e.value)}</span>
              <button
                type="button"
                onClick={() => removeEntry(e)}
                disabled={disabled}
                className="hover:bg-muted-foreground/20 rounded-sm"
                aria-label={`Remove ${e.relationTo}:${e.value}`}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="flex flex-row gap-2">
        <Select
          value={slug}
          onValueChange={(next) => setSlug(next)}
          disabled={disabled || relationTo.length === 0}
        >
          <SelectTrigger
            id={id ? `${id}-slug` : undefined}
            className="w-40"
            aria-invalid={invalid ? true : undefined}
          >
            <SelectValue placeholder="Collection…" />
          </SelectTrigger>
          <SelectContent>
            {relationTo.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {slug ? (
          <div className="flex-1">
            <RelationshipPicker
              relatedSlug={slug}
              useAsTitle={useAsTitleBySlug[slug]}
              multi={false}
              value={innerValue}
              onChange={handlePick}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

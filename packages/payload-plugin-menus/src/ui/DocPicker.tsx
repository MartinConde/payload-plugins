'use client'

/* Compact single-document picker. Unlike shadcn-admin's RelationshipPicker
   (which renders the selection as a chip ABOVE a "Change…" trigger), this shows
   the selected document's title INSIDE the combobox trigger — the modern
   select-style UX the menu editor wants. Client-only (lives behind the lazy
   MenuTreeEditor), so it freely uses shadcn primitives. Queries
   `/api/{slug}?where[{useAsTitle}][like]=…` exactly like RelationshipPicker. */

import * as React from 'react'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import clsx from 'clsx'

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'payload-plugin-shadcn-ui'

type DocResult = { id: string; title: string }

type Props = {
  relatedSlug: string
  useAsTitle: string | undefined
  value: string | null
  onChange: (value: string | null) => void
  activeLocale: string | null | undefined
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  clearLabel?: string
}

const titleOf = (doc: Record<string, unknown>, useAsTitle: string): string => {
  const v = doc[useAsTitle]
  if (typeof v === 'string' && v.length > 0) return v
  if (typeof v === 'number') return String(v)
  return String(doc.id)
}

export function DocPicker({
  relatedSlug,
  useAsTitle,
  value,
  onChange,
  activeLocale,
  disabled,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'No results',
  clearLabel = 'Clear',
}: Props): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [results, setResults] = React.useState<DocResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [titleCache, setTitleCache] = React.useState<Record<string, string>>({})

  const cacheKey = React.useCallback(
    (id: string) => `${activeLocale ?? ''}:${id}`,
    [activeLocale],
  )

  // Resolve the selected id's title (so the trigger can show it).
  React.useEffect(() => {
    if (!value || !useAsTitle || cacheKey(value) in titleCache) return
    let cancelled = false
    void (async () => {
      try {
        const params = new URLSearchParams({ depth: '0', draft: 'true' })
        if (activeLocale) params.set('locale', activeLocale)
        const res = await fetch(`/api/${relatedSlug}/${value}?${params.toString()}`, {
          credentials: 'include',
        })
        if (!res.ok || cancelled) return
        const doc = (await res.json()) as Record<string, unknown>
        if (!cancelled) {
          setTitleCache((p) => ({ ...p, [cacheKey(value)]: titleOf(doc, useAsTitle) }))
        }
      } catch {
        /* trigger falls back to the id */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [value, useAsTitle, relatedSlug, activeLocale, cacheKey, titleCache])

  // Search while open.
  React.useEffect(() => {
    if (!open || !useAsTitle) return
    let cancelled = false
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ depth: '0', draft: 'true', limit: '10' })
        if (search.trim()) params.set(`where[${useAsTitle}][like]`, search.trim())
        if (activeLocale) params.set('locale', activeLocale)
        const res = await fetch(`/api/${relatedSlug}?${params.toString()}`, {
          credentials: 'include',
        })
        if (!res.ok || cancelled) return
        const body = (await res.json()) as { docs?: Array<Record<string, unknown>> }
        const next: DocResult[] = (body.docs ?? []).map((d) => ({
          id: String(d.id),
          title: titleOf(d, useAsTitle),
        }))
        if (!cancelled) {
          setResults(next)
          setTitleCache((p) => {
            const merged = { ...p }
            for (const r of next) merged[cacheKey(r.id)] = r.title
            return merged
          })
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [open, search, relatedSlug, useAsTitle, activeLocale, cacheKey])

  const selectedTitle = value ? (titleCache[cacheKey(value)] ?? value) : ''

  // No useAsTitle on the related collection → plain id input fallback.
  if (!useAsTitle) {
    return (
      <input
        value={value ?? ''}
        disabled={disabled}
        placeholder="Document ID"
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      />
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-8 w-full justify-between border-input px-3 font-normal"
        >
          <span className={clsx('truncate', !selectedTitle && 'text-muted-foreground')}>
            {selectedTitle || placeholder}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-64 p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!loading && results.length === 0 ? (
              <CommandEmpty>{emptyLabel}</CommandEmpty>
            ) : null}
            {value ? (
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className="text-muted-foreground"
                >
                  <XIcon className="size-4" />
                  {clearLabel}
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup>
              {results.map((r) => (
                <CommandItem
                  key={r.id}
                  value={r.id}
                  onSelect={() => {
                    onChange(r.id)
                    setOpen(false)
                  }}
                >
                  <span className="flex-1 truncate">{r.title}</span>
                  <CheckIcon
                    className={clsx('size-4', value === r.id ? 'opacity-100' : 'opacity-0')}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

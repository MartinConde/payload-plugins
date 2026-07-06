'use client'

/* Combobox-style select widgets used by FieldInput's `select` case: a
   searchable single-select and a multi-select with removable badges. Split
   out of FieldInput.tsx since both are self-contained UI, independent of the
   field-type dispatch switch. */

import * as React from 'react'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { useTranslation } from '../../../internal/payloadAdapterUI.js'
import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Badge } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'payload-plugin-shadcn-ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'

/** Single-selects with more options than this render as a searchable combobox
 *  instead of a plain dropdown. */
export const SEARCHABLE_SELECT_THRESHOLD = 8

/** Searchable single-select combobox (Popover + Command), for long option
 *  lists like a locale picker. Mirrors MultiSelect's chrome but holds one
 *  value and closes on pick. */
export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  invalid,
  disabled,
}: {
  id: string
  options: { value: string; label: string }[]
  value: string
  onChange: (next: string) => void
  invalid?: boolean
  disabled?: boolean
}): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const [open, setOpen] = React.useState(false)
  const selectedLabel = options.find((o) => o.value === value)?.label
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          className={cn(
            'h-9 w-full justify-between border-input px-3 font-normal',
            'aria-invalid:border-destructive aria-invalid:ring-destructive/40',
          )}
        >
          <span
            className={cn('truncate', !selectedLabel && 'text-muted-foreground')}
          >
            {selectedLabel ?? t('general:selectValue')}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-56 p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={t('shadcnAdmin:searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('shadcnAdmin:noOptions')}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  <CheckIcon
                    className={cn(
                      'size-4',
                      value === opt.value ? 'opacity-100' : 'opacity-0',
                    )}
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

export function MultiSelect({
  id,
  options,
  value,
  onChange,
  invalid,
  disabled,
}: {
  id: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (next: string[]) => void
  invalid?: boolean
  disabled?: boolean
}): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const [open, setOpen] = React.useState(false)
  const labelFor = React.useCallback(
    (v: string) => options.find((o) => o.value === v)?.label ?? v,
    [options],
  )
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-[12rem] truncate">{labelFor(v)}</span>
              <button
                type="button"
                onClick={() => toggle(v)}
                className="hover:bg-muted-foreground/20 rounded-sm"
                aria-label={t('shadcnAdmin:removeField', { label: labelFor(v) })}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-invalid={invalid ? true : undefined}
            className={cn(
              'justify-start',
              'aria-invalid:border-destructive aria-invalid:ring-destructive/40',
            )}
          >
            {value.length === 0
              ? t('general:selectValue')
              : t('shadcnAdmin:addMore')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={t('shadcnAdmin:searchPlaceholder')} />
            <CommandList>
              <CommandEmpty>{t('shadcnAdmin:noOptions')}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const selected = value.includes(opt.value)
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.label}
                      onSelect={() => toggle(opt.value)}
                    >
                      <span className="flex-1 truncate">{opt.label}</span>
                      <CheckIcon
                        className={cn(
                          'size-4',
                          selected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

'use client'

/* Trailing "+ Add filter" pill. Opens a Popover with a Command-driven field
   picker. Selecting a field calls onAdd with the chosen field and its
   default operator, leaving the value empty for the chip editor to fill in. */

import * as React from 'react'
import { CirclePlusIcon } from 'lucide-react'
import { useTranslation } from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
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
import type { FieldMeta } from '../columns/fieldPicker.js'
import {
  defaultOperatorForField,
  isFilterable,
  isPolymorphicRelationship,
  type FilterChip,
} from './filterCodec.js'

const labelForField = (field: FieldMeta): string => {
  const raw = (field as { label?: unknown }).label
  if (typeof raw === 'string' && raw.length > 0) return raw
  if (!field.name) return field.type
  return field.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ')
}

type Props = {
  fields: ReadonlyArray<FieldMeta>
  onAdd: (chip: Omit<FilterChip, 'id'>) => void
}

export function AddFilterMenu({ fields, onAdd }: Props): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const [open, setOpen] = React.useState(false)
  const filterableFields = fields.filter(isFilterable)

  const handleSelect = (name: string) => {
    const field = fields.find((f) => f.name === name)
    if (!field) return
    if (isPolymorphicRelationship(field)) return
    onAdd({
      field: name,
      operator: defaultOperatorForField(field),
      value: null,
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 border border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <CirclePlusIcon className="size-3.5" />
          {t('general:addFilter')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={t('shadcnAdmin:findFieldPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('shadcnAdmin:noFields')}</CommandEmpty>
            <CommandGroup>
              {filterableFields.map((f) => {
                const disabled = isPolymorphicRelationship(f)
                return (
                  <CommandItem
                    key={f.name}
                    value={f.name as string}
                    disabled={disabled}
                    onSelect={() => handleSelect(f.name as string)}
                  >
                    <span className="flex-1 truncate">{labelForField(f)}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {f.type}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

'use client'

/* Contents rendered inside the chip's popover. Surfaces:
   - Field picker (search via Command)
   - Operator dropdown (Select)
   - Value input (delegated to FilterValueInput)
   - Match (AND / OR) toggle
   - Move left / right
   - Remove
*/

import * as React from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronsUpDownIcon,
  Trash2Icon,
} from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'
import type { FieldMeta } from '../columns/fieldPicker.js'
import {
  defaultOperatorForField,
  isFilterable,
  isPolymorphicRelationship,
  operatorsForField,
  resolveOperatorLabel,
  type FilterChip,
  type WhereOperator,
} from './filterCodec.js'
import { FilterValueInput } from './FilterValueInput.js'

const labelForField = (field: FieldMeta): string => {
  const raw = (field as { label?: unknown }).label
  if (typeof raw === 'string' && raw.length > 0) return raw
  if (!field.name) return field.type
  return field.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ')
}

type Props = {
  chip: FilterChip
  fields: ReadonlyArray<FieldMeta>
  useAsTitleBySlug?: Record<string, string | undefined>
  isInOrGroup: boolean
  isFirstNode: boolean
  canMoveLeft: boolean
  canMoveRight: boolean
  onChange: (patch: Partial<Omit<FilterChip, 'id'>>) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onToggleOrJoin: () => void
}

export function FilterChipEditor({
  chip,
  fields,
  useAsTitleBySlug,
  isInOrGroup,
  isFirstNode,
  canMoveLeft,
  canMoveRight,
  onChange,
  onRemove,
  onMove,
  onToggleOrJoin,
}: Props): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const [fieldPickerOpen, setFieldPickerOpen] = React.useState(false)

  const field = fields.find((f) => f.name === chip.field)
  const fieldLabel = field ? labelForField(field) : chip.field
  const operators = field ? operatorsForField(field) : []
  const opDesc = operators.find((o) => o.value === chip.operator)
  const showValue = Boolean(field) && !opDesc?.noValue

  const sectionLabel =
    'text-[10px] font-medium uppercase tracking-wide text-muted-foreground'

  const filterableFields = fields.filter(isFilterable)

  const handleFieldChange = (nextFieldName: string) => {
    const nextField = fields.find((f) => f.name === nextFieldName)
    if (!nextField) return
    onChange({
      field: nextFieldName,
      operator: defaultOperatorForField(nextField),
      value: null,
    })
    setFieldPickerOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className={sectionLabel}>{t('shadcnAdmin:filterField')}</span>
        <Popover open={fieldPickerOpen} onOpenChange={setFieldPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between"
            >
              <span className="truncate">{fieldLabel}</span>
              <ChevronsUpDownIcon className="ml-2 size-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput
                placeholder={t('shadcnAdmin:findFieldPlaceholder')}
              />
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
                        onSelect={() => handleFieldChange(f.name as string)}
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
      </div>

      {field && operators.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className={sectionLabel}>{t('shadcnAdmin:filterCondition')}</span>
          <Select
            value={chip.operator}
            onValueChange={(v) => {
              const next = v as WhereOperator
              // When switching to an array-valued or noValue operator, reset value
              const nextDesc = operators.find((o) => o.value === next)
              if (nextDesc?.noValue) {
                onChange({ operator: next, value: true })
              } else if (nextDesc?.multi) {
                onChange({
                  operator: next,
                  value: Array.isArray(chip.value) ? chip.value : [],
                })
              } else {
                onChange({
                  operator: next,
                  value: Array.isArray(chip.value) ? null : chip.value,
                })
              }
            }}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {resolveOperatorLabel(op.label, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showValue && field && (
        <div className="flex flex-col gap-1.5">
          <span className={sectionLabel}>{t('shadcnAdmin:filterValue')}</span>
          <FilterValueInput
            field={field}
            operator={chip.operator}
            value={chip.value}
            useAsTitleBySlug={useAsTitleBySlug}
            onChange={(v) => onChange({ value: v })}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 border-t pt-3">
        {!isFirstNode && (
          <label className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {isInOrGroup
                ? t('shadcnAdmin:matchOrWithPrevious')
                : t('shadcnAdmin:matchAndWithPrevious')}
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onToggleOrJoin}
            >
              {isInOrGroup
                ? t('shadcnAdmin:switchToAnd')
                : t('shadcnAdmin:switchToOr')}
            </Button>
          </label>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canMoveLeft}
              onClick={() => onMove(-1)}
              aria-label="Move left"
            >
              <ArrowLeftIcon className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canMoveRight}
              onClick={() => onMove(1)}
              aria-label="Move right"
            >
              <ArrowRightIcon className="size-3.5" />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2Icon className="mr-1 size-3.5" />
            {t('general:remove')}
          </Button>
        </div>
      </div>
    </div>
  )
}

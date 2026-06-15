'use client'

/* Per-field-type input switch, shared between the bulk-edit sheet and the
   auto doc form. Owns rendering only — labels, reset buttons, dirty/required
   chrome live in the caller. Semantics:
   - value: the current value (undefined = not yet touched).
   - onChange(next): emits the next value. Cleared text emits ''; cleared
     number/date emits null. Reset semantics (emit undefined to drop dirty
     state) live in the bulk-edit wrapper, not here.
   - id: input element id; defaults to a hash of field.name. Useful when the
     same form renders multiple inputs that share a name across boundaries.
   - nestedPath: full dotted path of this field within the form
     (e.g. `myArray.0.label`). Top-level fields pass `field.name`. Used by
     container inputs (array/blocks) to compose subfield paths for the
     bridge.
   - renderChild: a path-aware renderer the bridge passes down so container
     inputs can hand off subfield rendering back through the bridge. Without
     this, container types fall back to a stub message.
   - The per-field `field.custom['plugin-shadcn-admin'].input` override
     mirrors the verified `.cell` override pattern (see autoColumns.tsx).
     The override must be a client reference exported from a 'use client'
     module in the consumer's source. */

import * as React from 'react'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { useTranslation } from '../../../internal/payloadAdapter.js'
import type { TFunction } from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Badge } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import { Checkbox } from 'payload-plugin-shadcn-ui'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import { Textarea } from 'payload-plugin-shadcn-ui'
import { RadioGroup, RadioGroupItem } from 'payload-plugin-shadcn-ui'
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
import { cn } from 'payload-plugin-shadcn-ui'
import { RelationshipPicker } from '../../../shared/RelationshipPicker.js'
import { DateInput } from './DateInput.js'
import { PointInput } from './PointInput.js'
import { CodeInput } from './CodeInput.js'
import { JsonInput } from './JsonInput.js'
import { PolymorphicRelationshipInput } from './PolymorphicRelationshipInput.js'
import { ArrayInput } from './ArrayInput.js'
import { BlocksInput } from './BlocksInput.js'
import { RichTextInput } from './RichTextInput.js'
import { UploadFieldInput } from './UploadFieldInput.js'
import { coerceRelationshipValue } from './relationshipId.js'
import type {
  ExtractedBlock,
  ExtractedCollection,
  ExtractedField,
  ExtractedTab,
} from 'payload-plugin-shadcn-ui'
import type { RichTextRenderedEntry } from '../richtext/extractRichTextRenderedFields.js'

export type FieldInputOption =
  | string
  | { value: string; label: string }

export type FieldInputField = {
  type: string
  name: string
  label?: string | null
  hidden?: boolean
  hasMany?: boolean
  relationTo?: string | string[]
  options?: FieldInputOption[]
  admin?: {
    hidden?: boolean
    disableBulkEdit?: boolean
    description?: string
    date?: { displayFormat?: string }
    language?: string
  } | null
  custom?: Record<string, unknown>
  fields?: ExtractedField[]
  blocks?: ExtractedBlock[]
  tabs?: ExtractedTab[]
}

const PLUGIN_NAMESPACE = 'plugin-shadcn-admin'

export type FieldInputProps = {
  field: FieldInputField
  value: unknown
  useAsTitleBySlug: Record<string, string | undefined>
  /** Serializable metadata for every upload collection, keyed by slug. Only
   *  upload fields consume it (for the custom UploadNewDialog); defaults to `{}`
   *  so non-upload callers (bulk-edit, auth) need not supply it. */
  uploadCollectionsBySlug?: Record<string, ExtractedCollection>
  onChange: (value: unknown) => void
  id?: string
  required?: boolean
  invalid?: boolean
  disabled?: boolean
  nestedPath?: string
  renderChild?: (
    child: ExtractedField,
    pathPrefix: string,
    parentPerms?: unknown,
  ) => React.ReactNode
  /** Pre-rendered Payload Field element + initial value for richText fields,
   *  lifted from serverProps.formState. Looked up by nestedPath in the bridge
   *  and passed in here. Absent → either not a richText field, or rebuild
   *  in flight for a freshly-added array/blocks row. */
  richTextRendered?: RichTextRenderedEntry
  operation?: 'create' | 'update'
  /** Active locale code (null when localization is off). Forwarded so
   *  `.input` overrides on group/tabs containers can slice individually-
   *  localized subfield values (`{ [locale]: value }`) without reaching for a
   *  context. Threaded from the bridge via FieldTreeRenderer. */
  activeLocale?: string | null
  /** v3.7: the FieldPermissions of THIS field itself. For array/blocks
   *  containers this is forwarded as `rowPerms`/`blockPerms` so per-row
   *  subfields can be gated. */
  fieldPerms?: unknown
  /** Active i18n `t`, injected by `FieldInput` and forwarded to `.input`
   *  override components. Overrides that ship as a direct (Node-loaded)
   *  component reference cannot import `@payloadcms/ui` to call
   *  `useTranslation()` themselves (its barrel pulls CSS that crashes the
   *  Payload CLI's Node config load), so they read `t` from here instead. */
  t?: TFunction
}

export const normalizeOptions = (
  options: FieldInputOption[] | undefined,
): { value: string; label: string }[] => {
  if (!options) return []
  return options.map((opt) =>
    typeof opt === 'string'
      ? { value: opt, label: opt }
      : { value: String(opt.value), label: opt.label ?? String(opt.value) },
  )
}

export function FieldInput(props: FieldInputProps): React.ReactElement {
  const {
    field,
    value,
    useAsTitleBySlug,
    uploadCollectionsBySlug = {},
    onChange,
    id,
    required,
    invalid,
    disabled,
    nestedPath,
    renderChild,
    richTextRendered,
    operation,
    fieldPerms,
  } = props
  const elementId = id ?? `field-${field.name}`
  const ariaInvalid = invalid ? true : undefined
  const invalidRing =
    'aria-invalid:border-destructive aria-invalid:ring-destructive/40'
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()

  // Per-field input override — mirrors the .cell override resolver in
  // autoColumns.tsx. The override receives the same props the built-in switch
  // would have (plus `t` for translation); consumers can ignore the ones they
  // don't need.
  const overrideRaw = (field.custom?.[PLUGIN_NAMESPACE] as
    | { input?: unknown }
    | undefined)?.input
  if (overrideRaw) {
    const Override = overrideRaw as React.ComponentType<FieldInputProps>
    return <Override {...props} t={t as TFunction} />
  }

  switch (field.type) {
    case 'text':
    case 'email': {
      return (
        <Input
          id={elementId}
          type={field.type === 'email' ? 'email' : 'text'}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={invalidRing}
        />
      )
    }

    case 'textarea': {
      return (
        <Textarea
          id={elementId}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          required={required}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={invalidRing}
        />
      )
    }

    case 'number': {
      const stringVal =
        typeof value === 'number'
          ? String(value)
          : typeof value === 'string'
            ? value
            : ''
      return (
        <Input
          id={elementId}
          type="number"
          value={stringVal}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            const n = Number(raw)
            onChange(Number.isFinite(n) ? n : raw)
          }}
          required={required}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={invalidRing}
        />
      )
    }

    case 'date': {
      const displayFormat = field.admin?.date?.displayFormat ?? ''
      const includesTime = /[Hhms]/.test(displayFormat)
      return (
        <DateInput
          id={elementId}
          value={value}
          onChange={(next) => onChange(next)}
          withTime={includesTime}
          required={required}
          invalid={invalid}
          disabled={disabled}
        />
      )
    }

    case 'checkbox': {
      const checked = value === true
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={elementId}
            checked={checked}
            onCheckedChange={(next) => onChange(next === true)}
            disabled={disabled}
          />
          <label
            htmlFor={elementId}
            className="text-sm text-muted-foreground"
          >
            {checked ? t('general:true') : t('general:false')}
          </label>
        </div>
      )
    }

    case 'radio': {
      const options = normalizeOptions(field.options)
      return (
        <RadioGroup
          value={typeof value === 'string' ? value : ''}
          onValueChange={(next) => onChange(next)}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className="gap-2"
        >
          {options.map((opt) => {
            const optId = `${elementId}-${opt.value}`
            return (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem id={optId} value={opt.value} />
                <label htmlFor={optId} className="text-sm">
                  {opt.label}
                </label>
              </div>
            )
          })}
        </RadioGroup>
      )
    }

    case 'select': {
      const options = normalizeOptions(field.options)
      if (field.hasMany) {
        return (
          <MultiSelect
            id={elementId}
            options={options}
            value={Array.isArray(value) ? value.map((v) => String(v)) : []}
            onChange={(next) => onChange(next)}
            invalid={invalid}
            disabled={disabled}
          />
        )
      }
      // Long option lists (e.g. a locale picker) get a searchable combobox;
      // short ones stay a plain dropdown (a search box for 2–3 options is
      // noise).
      if (options.length > SEARCHABLE_SELECT_THRESHOLD) {
        return (
          <SearchableSelect
            id={elementId}
            options={options}
            value={typeof value === 'string' ? value : ''}
            onChange={(next) => onChange(next)}
            invalid={invalid}
            disabled={disabled}
          />
        )
      }
      return (
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={(next) => onChange(next)}
          disabled={disabled}
        >
          <SelectTrigger
            id={elementId}
            className={cn('w-full', invalidRing)}
            aria-invalid={ariaInvalid}
          >
            <SelectValue placeholder={t('general:selectValue')} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    case 'relationship': {
      if (Array.isArray(field.relationTo)) {
        return (
          <PolymorphicRelationshipInput
            id={elementId}
            relationTo={field.relationTo}
            hasMany={field.hasMany}
            useAsTitleBySlug={useAsTitleBySlug}
            value={value}
            onChange={(next) => onChange(coerceRelationshipValue(next))}
            invalid={invalid}
            disabled={disabled}
          />
        )
      }
      if (!field.relationTo) {
        return <em className="text-xs text-muted-foreground">Unsupported</em>
      }
      const relatedSlug = field.relationTo
      const useAsTitle = useAsTitleBySlug[relatedSlug]
      const excludeDescendantsPath = (
        field.custom?.['plugin-shadcn-admin'] as
          | { excludeDescendantsVia?: string }
          | undefined
      )?.excludeDescendantsVia
      const normalized: string | string[] | null =
        value === null || value === undefined
          ? null
          : Array.isArray(value)
            ? value.map((v) => String(v))
            : typeof value === 'object' && 'id' in (value as any)
              ? String((value as any).id)
              : String(value)
      return (
        <RelationshipPicker
          relatedSlug={relatedSlug}
          useAsTitle={useAsTitle}
          multi={Boolean(field.hasMany)}
          value={normalized}
          onChange={(next) => onChange(coerceRelationshipValue(next))}
          excludeDescendantsPath={excludeDescendantsPath}
        />
      )
    }

    case 'point': {
      return (
        <PointInput
          id={elementId}
          value={value}
          onChange={(next) => onChange(next)}
          required={required}
          invalid={invalid}
          disabled={disabled}
        />
      )
    }

    case 'code': {
      return (
        <CodeInput
          id={elementId}
          value={value}
          language={field.admin?.language}
          onChange={(next) => onChange(next)}
          required={required}
          invalid={invalid}
          disabled={disabled}
        />
      )
    }

    case 'json': {
      return (
        <JsonInput
          id={elementId}
          value={value}
          onChange={(next) => onChange(next)}
          required={required}
          invalid={invalid}
          disabled={disabled}
        />
      )
    }

    case 'array': {
      if (!renderChild || !nestedPath) {
        return (
          <em className="text-xs text-muted-foreground">
            Array fields require a path-aware renderer.
          </em>
        )
      }
      return (
        <ArrayInput
          id={elementId}
          field={field as ExtractedField}
          value={value}
          onChange={(next) => onChange(next)}
          nestedPath={nestedPath}
          renderChild={renderChild}
          disabled={disabled}
          rowPerms={fieldPerms}
        />
      )
    }

    case 'blocks': {
      if (!renderChild || !nestedPath) {
        return (
          <em className="text-xs text-muted-foreground">
            Blocks fields require a path-aware renderer.
          </em>
        )
      }
      return (
        <BlocksInput
          id={elementId}
          field={field as ExtractedField}
          value={value}
          onChange={(next) => onChange(next)}
          nestedPath={nestedPath}
          renderChild={renderChild}
          disabled={disabled}
          blockPerms={fieldPerms}
        />
      )
    }

    case 'upload': {
      // Field-level upload = relationship to one or more upload-collection
      // docs. Non-polymorphic: value is a doc id (or string[] when hasMany).
      // Polymorphic (v3.6, relationTo: string[]): value is `{ relationTo,
      // value }` (or an array of envelopes when hasMany), same shape as
      // PolymorphicRelationshipInput.
      if (!field.relationTo) {
        return <em className="text-xs text-muted-foreground">Unsupported</em>
      }
      return (
        <UploadFieldInput
          id={elementId}
          fieldName={field.name}
          relationTo={field.relationTo}
          hasMany={field.hasMany}
          useAsTitleBySlug={useAsTitleBySlug}
          uploadCollectionsBySlug={uploadCollectionsBySlug}
          value={value}
          onChange={(next) => onChange(coerceRelationshipValue(next))}
          disabled={disabled}
          invalid={invalid}
        />
      )
    }

    case 'richText': {
      if (!nestedPath || !operation) {
        return (
          <em className="text-xs text-muted-foreground">
            richText fields require a nested path and operation.
          </em>
        )
      }
      if (!richTextRendered) {
        // No pre-rendered element: either initial form state didn't include
        // this path (shouldn't happen for top-level / group / tabs) OR the
        // bridge is currently rebuilding form state for this row after an
        // array/blocks add/remove/reorder. Show a shimmer the size of the
        // editor toolbar to keep layout stable.
        return (
          <div
            className="h-32 w-full animate-pulse rounded-md border border-input bg-muted/30"
            aria-busy="true"
            aria-label="Loading editor…"
          />
        )
      }
      return (
        <RichTextInput
          id={elementId}
          path={nestedPath}
          rendered={richTextRendered}
          value={value}
          onChange={(next) => onChange(next)}
          operation={operation}
          disabled={disabled}
        />
      )
    }

    // Presentational `ui` fields carry their component in the
    // `custom['plugin-shadcn-admin'].input` override (handled above); without
    // one there's nothing to render.
    case 'ui':
      return null

    default:
      return (
        <em className="text-xs text-muted-foreground">
          Unsupported field type: {field.type}
        </em>
      )
  }
}

/** Single-selects with more options than this render as a searchable combobox
 *  instead of a plain dropdown. */
const SEARCHABLE_SELECT_THRESHOLD = 8

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

function MultiSelect({
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

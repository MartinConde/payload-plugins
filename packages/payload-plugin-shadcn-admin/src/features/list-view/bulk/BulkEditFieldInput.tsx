'use client'

/* Bulk-edit chrome around the shared per-field-type input. Sparse semantics:
   - `value` is the currently dirty value (or undefined if the user hasn't
     touched the field).
   - `onChange(next)` records a dirty value.
   - `onReset()` emits "drop dirty state" (the wrapper turns the input back
     into 'no change'). Used by the Reset button next to each input. */

import * as React from 'react'
import { RotateCcwIcon } from 'lucide-react'

import {
  FieldInput,
  type FieldInputField,
  type FieldInputOption,
} from '../../doc-form/inputs/FieldInput.js'
import { isFieldSupportedForDocForm } from '../../doc-form/eligibility/isSupportedForDocForm.js'

export type BulkEditSelectOption = FieldInputOption

export type BulkEditField = FieldInputField

type Props = {
  field: BulkEditField
  value: unknown
  isDirty: boolean
  useAsTitleBySlug: Record<string, string | undefined>
  onChange: (value: unknown) => void
  onReset: () => void
}

const fieldLabel = (field: BulkEditField): string =>
  field.label && field.label.length > 0 ? field.label : field.name

/* Every field type the doc form can render is now bulk-editable — the drawer
   reuses the doc form's renderers (see BulkEditSheet). The only opt-out is the
   per-field `admin.disableBulkEdit` flag. (Note: array / blocks / richText /
   structural containers are edited through BulkEditSheet's picker, which wires
   the recursion + standalone richText; this standalone wrapper is best used for
   leaf/relationship/upload types.) */
export const isBulkEditable = (field: BulkEditField): boolean => {
  if (field.admin?.disableBulkEdit) return false
  return isFieldSupportedForDocForm(field as never)
}

export function BulkEditFieldInput({
  field,
  value,
  isDirty,
  useAsTitleBySlug,
  onChange,
  onReset,
}: Props): React.ReactElement {
  const label = fieldLabel(field)
  const description = field.admin?.description
  const editable = isBulkEditable(field)
  const disabledReason = !editable
    ? field.type === 'relationship' && Array.isArray(field.relationTo)
      ? 'Polymorphic relationships are not editable in bulk for v1.'
      : `\`${field.type}\` is not editable in bulk for v1.`
    : null

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`bulk-edit-${field.name}`}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {field.hasMany ? (
            <span className="ml-1 text-xs text-muted-foreground">(multiple)</span>
          ) : null}
        </label>
        {editable && isDirty ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label={`Reset ${label}`}
          >
            <RotateCcwIcon className="size-3" />
            Reset
          </button>
        ) : null}
      </div>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {disabledReason ? (
        <div
          className="rounded-md border border-dashed border-input bg-muted/30 p-2 text-xs text-muted-foreground"
          title={disabledReason}
        >
          {disabledReason}
        </div>
      ) : (
        <FieldInput
          field={field}
          value={value}
          useAsTitleBySlug={useAsTitleBySlug}
          onChange={onChange}
          id={`bulk-edit-${field.name}`}
        />
      )}
    </div>
  )
}

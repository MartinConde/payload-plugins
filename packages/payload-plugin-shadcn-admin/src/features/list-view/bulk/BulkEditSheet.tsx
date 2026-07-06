'use client'

/* Bulk-edit sheet for the auto list view. Covers every field type the doc form
   supports by reusing the doc form's own renderers (makeFieldTreeRenderer) — no
   second field-editor matrix.

   UX is a field-picker, not a render-everything form: the user adds one or more
   fields to set (structural containers are flattened to their inner leaves),
   fills them, then confirms a review diff before the PATCH fires. This keeps
   the drawer light even when richText / array / blocks are in play.

   Two-step flow:
   1. edit — pick fields and fill values. Picked fields are the explicit set to
      apply; removing a field drops it from the PATCH.
   2. review — confirms the diff before PATCH
      /api/{slug}?where[id][in][]=…&locale=<active> fires (one batch request).
   On 2xx we call onSuccess() (the caller clears selection + refreshes). On
   non-2xx the sheet stays on review and shows the server error inline.

   Write semantics:
   - leaves under the same container merge into one nested body (buildPatchBody);
   - array / blocks ship their whole value (Payload replaces them wholesale);
   - upload / relationship ship id(s) / poly envelopes as JSON (uploading a new
     file is handled inside UploadFieldInput — it creates the media doc and
     stores its id, so bulk never needs multipart);
   - localized leaves are projected to the active locale and the PATCH is scoped
     with ?locale=<active>, matching the doc form and trash-restore. */

import * as React from 'react'
import { PlusIcon, RotateCcwIcon } from 'lucide-react'
import { useConfig, useLocale, useTranslation } from '../../../internal/payloadAdapterUI.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'payload-plugin-shadcn-ui'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'
import type {
  ExtractedField,
} from 'payload-plugin-shadcn-ui'
import { makeFieldTreeRenderer } from '../../doc-form/fieldTree/FieldTreeRenderer.js'
import {
  collectLocalizedSchemaPaths,
  getByPath,
  isObject,
  projectLocaleAtLeaves,
  setByPath,
  stripPathIndices,
} from '../../doc-form/fieldTree/sharedHelpers.js'
import {
  collectBulkEditableLeaves,
  type PickableField,
} from './bulkEditLeaves.js'
import { buildPatchBody } from './buildPatchBody.js'
import { useDocFormRichText } from '../../doc-form/richtext/useDocFormRichText.js'
import { ReviewList } from './BulkEditReview.js'

/** The serializable collection subset the bulk-edit drawer needs (the same
 *  shape AutoColumnsBridge forwards). Kept exported for backward-compat with
 *  `payload-plugin-shadcn-admin/client`. */
export type BulkEditableCollection = {
  slug: string
  fields: ExtractedField[]
}

export type BulkEditSheetProps = {
  collectionSlug: string
  collection: BulkEditableCollection
  selectedIds: (string | number)[]
  useAsTitleBySlug: Record<string, string | undefined>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const RICHTEXT_REFETCH_TYPES = new Set(['richText', 'array', 'blocks'])

export function BulkEditSheet({
  collectionSlug,
  collection,
  selectedIds,
  useAsTitleBySlug,
  open,
  onOpenChange,
  onSuccess,
}: BulkEditSheetProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const [step, setStep] = React.useState<'edit' | 'review'>('edit')
  const [pickedPaths, setPickedPaths] = React.useState<string[]>([])
  const [shim, setShim] = React.useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)

  // The admin's current locale (from Payload's app-wide state) is the default
  // target; the drawer also lets the user pick which locale to bulk-edit, since
  // the list view itself surfaces no locale switcher.
  const locale = useLocale()
  const adminLocale =
    locale && typeof locale === 'object' && 'code' in locale
      ? ((locale as { code?: string }).code ?? null)
      : null
  const { config } = useConfig()
  const locales = config.localization ? config.localization.locales : []
  const localizationEnabled = Boolean(adminLocale) && locales.length > 0

  const [activeLocale, setActiveLocale] = React.useState<string | null>(
    adminLocale,
  )

  // Reset whenever the sheet opens or the selection changes.
  React.useEffect(() => {
    if (!open) return
    setStep('edit')
    setPickedPaths([])
    setShim({})
    setSubmitting(false)
    setError(null)
    setActiveLocale(adminLocale)
  }, [open, selectedIds.length, adminLocale])

  const leaves = React.useMemo(
    () => collectBulkEditableLeaves(collection.fields),
    [collection.fields],
  )
  const leafByPath = React.useMemo(() => {
    const m = new Map<string, PickableField>()
    for (const leaf of leaves) m.set(leaf.path, leaf)
    return m
  }, [leaves])
  const available = React.useMemo(
    () => leaves.filter((l) => !pickedPaths.includes(l.path)),
    [leaves, pickedPaths],
  )

  const localizedSchemaPaths = React.useMemo(() => {
    const out = new Set<string>()
    collectLocalizedSchemaPaths(collection.fields, '', out)
    return out
  }, [collection.fields])
  const isPathLocalized = React.useCallback(
    (path: string): boolean =>
      localizationEnabled && localizedSchemaPaths.has(stripPathIndices(path)),
    [localizationEnabled, localizedSchemaPaths],
  )

  const setValueAtPath = React.useCallback(
    (path: string, next: unknown) => {
      setShim((prev) => {
        if (isPathLocalized(path) && activeLocale) {
          const cur = getByPath(prev, path)
          const merged: Record<string, unknown> = isObject(cur)
            ? { ...cur, [activeLocale]: next }
            : { [activeLocale]: next }
          return setByPath(prev, path, merged)
        }
        return setByPath(prev, path, next)
      })
    },
    [isPathLocalized, activeLocale],
  )

  const getProjectedData = React.useCallback(
    (): Record<string, unknown> =>
      localizationEnabled && activeLocale
        ? projectLocaleAtLeaves(shim, collection.fields, activeLocale)
        : shim,
    [shim, localizationEnabled, activeLocale, collection.fields],
  )

  // Refetch the standalone richText editors when a richText (or richText-
  // bearing array/blocks) field is picked, or the locale changes.
  const richTextTrigger = pickedPaths
    .filter((p) => RICHTEXT_REFETCH_TYPES.has(leafByPath.get(p)?.type ?? ''))
    .join('|')
  const richTextRendered = useDocFormRichText({
    collectionFields: collection.fields,
    collectionSlug,
    getProjectedData,
    trigger: richTextTrigger,
    activeLocale,
    operation: 'update',
  })

  const renderer = makeFieldTreeRenderer({
    values: shim,
    errors: {},
    activeLocale,
    localizationEnabled,
    disabled: submitting,
    setValueAtPath,
    richTextRendered,
    useAsTitleBySlug,
    operation: 'update',
    showFieldChrome: false,
    idPrefix: 'bulk-edit-',
  })

  const pick = (path: string) => {
    setPickedPaths((prev) => (prev.includes(path) ? prev : [...prev, path]))
    setPickerOpen(false)
  }
  const unpick = (path: string) => {
    setPickedPaths((prev) => prev.filter((p) => p !== path))
  }

  const count = selectedIds.length
  const hasPicked = pickedPaths.length > 0

  const handleApply = async () => {
    setSubmitting(true)
    setError(null)
    try {
      // Relationship / upload ids are already coerced to the right type at the
      // FieldInput layer (see inputs/relationshipId.ts).
      const projected = getProjectedData()
      const body = buildPatchBody(pickedPaths, projected)
      const params = new URLSearchParams()
      selectedIds.forEach((id) => params.append('where[id][in][]', String(id)))
      // Scope to the active locale so required localized fields in OTHER
      // locales don't fail validation (mirrors the doc form / trash restore).
      if (activeLocale) params.append('locale', activeLocale)
      const res = await fetch(`/api/${collectionSlug}?${params.toString()}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let message = `Update failed (${res.status})`
        try {
          const errBody = (await res.json()) as {
            errors?: { message?: string }[]
            message?: string
          }
          if (errBody?.errors?.[0]?.message) message = errBody.errors[0].message!
          else if (errBody?.message) message = errBody.message
        } catch {
          // Body wasn't JSON; keep the status-derived message.
        }
        throw new Error(message)
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Inline (not a Popover): the drawer is a Radix Sheet whose scroll-lock
  // (react-remove-scroll) swallows wheel events on portaled content, so a
  // Popover list wouldn't scroll with the wheel. Rendering the picker inside
  // the Sheet keeps it within the allowed scroll container.
  const addFieldMenu = (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={available.length === 0}
        onClick={() => setPickerOpen((o) => !o)}
      >
        <PlusIcon className="size-3.5" />
        <span className="ml-1">{t('shadcnAdmin:addField')}</span>
      </Button>
      {pickerOpen && available.length > 0 ? (
        <Command className="rounded-md border">
          <CommandInput placeholder={t('shadcnAdmin:findFieldPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('shadcnAdmin:noFields')}</CommandEmpty>
            <CommandGroup>
              {available.map((leaf) => (
                <CommandItem
                  key={leaf.path}
                  value={`${leaf.label} ${leaf.path}`}
                  onSelect={() => pick(leaf.path)}
                >
                  <span className="truncate">{leaf.label}</span>
                  <span className="ml-auto pl-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {leaf.type}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      ) : null}
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>
            {step === 'edit'
              ? t('shadcnAdmin:editCount', { count })
              : t('shadcnAdmin:reviewChangesCount', { count })}
          </SheetTitle>
          <SheetDescription>
            {step === 'edit'
              ? t('shadcnAdmin:editStepDesc')
              : t('shadcnAdmin:reviewStepDesc')}
          </SheetDescription>
          {localizationEnabled && locales.length > 1 ? (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {t('shadcnAdmin:editingLocale')}
              </span>
              <Select
                value={activeLocale ?? undefined}
                onValueChange={setActiveLocale}
                disabled={submitting}
              >
                <SelectTrigger
                  className="h-7 w-auto gap-1 text-xs"
                  aria-label={t('shadcnAdmin:editingLocale')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {typeof l.label === 'string' ? l.label : l.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </SheetHeader>

        {error ? (
          <div className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-4">
          {step === 'edit' ? (
            <div className="flex flex-col gap-4">
              <div>{addFieldMenu}</div>
              {pickedPaths.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('shadcnAdmin:noFieldsAddedYet')}
                </p>
              ) : (
                pickedPaths.map((path) => {
                  const leaf = leafByPath.get(path)
                  if (!leaf) return null
                  const description = leaf.field.admin?.description
                  return (
                    <div key={path} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`bulk-edit-${path}`}
                          className="text-sm font-medium text-foreground"
                        >
                          {leaf.label}
                          {leaf.field.hasMany ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({t('shadcnAdmin:fieldMultiple')})
                            </span>
                          ) : null}
                        </label>
                        <button
                          type="button"
                          onClick={() => unpick(path)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          aria-label={t('shadcnAdmin:removeField', {
                            label: leaf.label,
                          })}
                        >
                          <RotateCcwIcon className="size-3" />
                          {t('general:remove')}
                        </button>
                      </div>
                      {description ? (
                        <p className="text-xs text-muted-foreground">
                          {description}
                        </p>
                      ) : null}
                      {renderer.renderField(
                        leaf.field as ExtractedField,
                        leaf.pathPrefix,
                      )}
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <ReviewList
              pickedPaths={pickedPaths}
              leafByPath={leafByPath}
              projected={getProjectedData()}
              count={count}
              useAsTitleBySlug={useAsTitleBySlug}
            />
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t">
          {step === 'edit' ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t('general:cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!hasPicked}
                onClick={() => {
                  setError(null)
                  setStep('review')
                }}
              >
                {t('shadcnAdmin:reviewChanges')}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => setStep('edit')}
              >
                {t('shadcnAdmin:back')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submitting || !hasPicked}
                onClick={handleApply}
              >
                {submitting
                  ? `${t('shadcnAdmin:applying')}…`
                  : t('shadcnAdmin:applyToCount', { count })}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

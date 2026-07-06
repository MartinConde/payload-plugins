'use client'

/* Custom shadcn replacement for Payload's native BulkUploadDrawer ("Add files").

   Drives upload-collection creates from two entry points:
   - the "Upload new" button on field-level type:'upload' / upload-relationship
     fields (UploadFieldInput), and
   - multi-file drops on an upload collection's /create page
     (CollectionUploadHeader).

   Each picked file becomes a row carrying its own copy of the target
   collection's fields. Rows render the FULL field tree via the shared
   `makeFieldTreeRenderer` (the same renderer the doc form and bulk-edit drawer
   use) — so every field type works, including group/tabs/array/blocks and
   richText. richText editors are fetched per row via `useDocFormRichText`
   (a getFormState round-trip), which only fires when the collection actually
   has richText/array/blocks fields. Localized fields are edited per-locale via
   a locale picker and projected to the active locale at submit.

   Rows submit sequentially via the shared `buildUploadFormData` wire-format
   helper — the same path the doc-form bridge uses — so the v3.23 R2
   client-direct upload branch can't drift. */

import * as React from 'react'
import {
  useUploadHandlers,
  useLocale,
  useConfig,
  useTranslation,
} from '../../../internal/payloadAdapterUI.js'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import type {
  ExtractedCollection,
  ExtractedField,
} from 'payload-plugin-shadcn-ui'
import {
  collectLocalizedSchemaPaths,
  getByPath,
  projectLocaleAtLeaves,
} from '../fieldTree/sharedHelpers.js'
import { DropzoneInput } from '../inputs/DropzoneInput.js'
import { buildUploadFormData, parsePayloadErrorResponse } from './uploadWireFormat.js'
import {
  isEmptyValue,
  nextRowId,
  topLevelRequiredLeafNames,
} from './uploadRowHelpers.js'
import { UploadRowForm } from './UploadRowForm.js'

export type UploadCreated = { id: string | number; slug: string }

export type UploadNewDialogProps = {
  open: boolean
  onOpenChange: (next: boolean) => void
  /** Active target upload collection slug (poly fields switch this upstream). */
  collectionSlug: string
  /** Serializable metadata for every upload collection, keyed by slug. */
  uploadCollectionsBySlug: Record<string, ExtractedCollection>
  useAsTitleBySlug: Record<string, string | undefined>
  /** 1 → single-file (non-hasMany field). 0 / undefined → unlimited. */
  maxFiles?: number
  /** Pre-seeded files (e.g. a collection-level multi-drop). */
  initialFiles?: File[]
  /** Fired once all rows that uploaded successfully are created. */
  onSuccess: (created: UploadCreated[]) => void
}

type RowStatus = 'idle' | 'uploading' | 'done' | 'error'

type Row = {
  id: string
  file: File
  /** Doc-root value tree. Localized leaves hold `{locale: value}` objects.
   *  Only keys the user touched are present — untouched fields stay absent so
   *  the server applies their `defaultValue` on create (mirrors the bridge). */
  values: Record<string, unknown>
  /** Path-keyed error messages (client required + server validation). */
  errors: Record<string, string>
  topError: string | null
  status: RowStatus
  createdId?: string | number
}

export function UploadNewDialog({
  open,
  onOpenChange,
  collectionSlug,
  uploadCollectionsBySlug,
  useAsTitleBySlug,
  maxFiles,
  initialFiles,
  onSuccess,
}: UploadNewDialogProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const { getUploadHandler } = useUploadHandlers()

  const meta = uploadCollectionsBySlug[collectionSlug]
  const uploadConfig = meta && meta.upload ? meta.upload : undefined
  const collectionFields = meta?.fields ?? []

  // Localization (read app-wide state directly, like the bulk-edit drawer). The
  // locale picker only appears when the collection has localized fields AND more
  // than one locale is configured.
  const locale = useLocale()
  const adminLocale =
    locale && typeof locale === 'object' && 'code' in locale
      ? ((locale as { code?: string }).code ?? null)
      : null
  const { config } = useConfig()
  const locales = config.localization ? config.localization.locales : []
  const hasLocalizedFields = React.useMemo(() => {
    const out = new Set<string>()
    collectLocalizedSchemaPaths(collectionFields, '', out)
    return out.size > 0
  }, [collectionFields])
  const localizationEnabled = Boolean(adminLocale) && hasLocalizedFields
  const showLocalePicker = localizationEnabled && locales.length > 1
  const [activeLocale, setActiveLocale] = React.useState<string | null>(
    adminLocale,
  )

  const singleFile = maxFiles === 1
  const labelSingular = meta?.labels?.singular ?? collectionSlug
  const requiredLeafNames = React.useMemo(
    () => topLevelRequiredLeafNames(collectionFields),
    [collectionFields],
  )

  const makeRow = React.useCallback(
    (file: File): Row => ({
      id: nextRowId(),
      file,
      values: {},
      errors: {},
      topError: null,
      status: 'idle',
    }),
    [],
  )

  const [rows, setRows] = React.useState<Row[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  // Seed rows from initialFiles whenever the dialog opens; reset on close and
  // reset the active locale to the admin's current locale.
  React.useEffect(() => {
    if (!open) {
      setRows([])
      setSubmitting(false)
      return
    }
    setActiveLocale(adminLocale)
    const seed = initialFiles ?? []
    const capped = singleFile ? seed.slice(0, 1) : seed
    setRows(capped.map((f) => makeRow(f)))
    // initialFiles identity is stable per open in practice; intentionally
    // narrow deps to the open transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const canAddMore = singleFile ? rows.length < 1 : true

  const addFiles = (files: File[]) => {
    if (files.length === 0) return
    setRows((prev) => {
      const room = singleFile ? Math.max(0, 1 - prev.length) : files.length
      const toAdd = files.slice(0, room).map((f) => makeRow(f))
      return [...prev, ...toAdd]
    })
  }

  const replaceFile = (id: string, file: File) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, file, status: 'idle', topError: null } : r,
      ),
    )
  }

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const setRowValues = (id: string, values: Record<string, unknown>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, values } : r)))
  }

  const clearRowError = (id: string, path: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id || !(path in r.errors)) return r
        const next = { ...r.errors }
        delete next[path]
        return { ...r, errors: next }
      }),
    )
  }

  // Client required check for one row (top-level leaves only), evaluated against
  // the locale-projected values so localized leaves resolve to the active slice.
  const clientErrors = (row: Row): Record<string, string> => {
    if (requiredLeafNames.length === 0) return {}
    const projected =
      localizationEnabled && activeLocale
        ? projectLocaleAtLeaves(row.values, collectionFields, activeLocale)
        : row.values
    const errs: Record<string, string> = {}
    for (const name of requiredLeafNames) {
      if (isEmptyValue(getByPath(projected, name))) {
        errs[name] = 'This field is required.'
      }
    }
    return errs
  }

  const handleUpload = async () => {
    if (rows.length === 0 || submitting) return

    // Pre-flight: client required checks. Compute synchronously from the current
    // snapshot (a setRows updater runs later, so we can't read a flag set inside
    // it). Server validation covers nested/complex fields after submit.
    let blocked = false
    const validated = rows.map((r) => {
      if (r.status === 'done') return r
      const errs = clientErrors(r)
      if (Object.keys(errs).length > 0) blocked = true
      return { ...r, errors: errs }
    })
    if (blocked) {
      setRows(validated)
      return
    }

    setSubmitting(true)
    const created: UploadCreated[] = []
    const working = validated
    const localeQuery = activeLocale
      ? `?locale=${encodeURIComponent(activeLocale)}`
      : ''

    for (const row of working) {
      if (row.status === 'done') {
        if (row.createdId !== undefined)
          created.push({ id: row.createdId, slug: collectionSlug })
        continue
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, status: 'uploading', topError: null } : r,
        ),
      )
      try {
        const body =
          localizationEnabled && activeLocale
            ? projectLocaleAtLeaves(row.values, collectionFields, activeLocale)
            : row.values
        const fd = await buildUploadFormData({
          body: { ...body },
          file: row.file,
          collectionSlug,
          getUploadHandler: getUploadHandler as never,
        })
        const res = await fetch(`/api/${collectionSlug}${localeQuery}`, {
          method: 'POST',
          credentials: 'include',
          body: fd,
        })
        if (!res.ok) {
          let parsed = {}
          try {
            parsed = await res.json()
          } catch {
            // non-JSON body
          }
          const { fieldErrors, fallback } = parsePayloadErrorResponse(parsed)
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? {
                    ...r,
                    status: 'error',
                    errors: fieldErrors,
                    topError:
                      Object.keys(fieldErrors).length > 0
                        ? null
                        : fallback ?? `Upload failed (${res.status})`,
                  }
                : r,
            ),
          )
          continue
        }
        const ok = (await res.json()) as { doc?: { id?: string | number } }
        const id = ok.doc?.id
        if (id !== undefined) created.push({ id, slug: collectionSlug })
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, status: 'done', createdId: id } : r,
          ),
        )
      } catch (err) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: 'error',
                  topError:
                    err instanceof Error ? err.message : 'Upload failed.',
                }
              : r,
          ),
        )
      }
    }

    setSubmitting(false)
    if (created.length > 0) onSuccess(created)
    // Close only when every row succeeded; otherwise keep the dialog open so
    // the user sees the per-row errors and can retry.
    if (created.length === working.length) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {singleFile
              ? t('shadcnAdmin:uploadTitle', { label: labelSingular })
              : t('shadcnAdmin:uploadTitleMultiple', { label: labelSingular })}
          </DialogTitle>
          <DialogDescription>
            {singleFile
              ? t('shadcnAdmin:uploadDescription', { label: labelSingular })
              : t('shadcnAdmin:uploadDescriptionMultiple', {
                  label: labelSingular,
                })}
          </DialogDescription>
        </DialogHeader>

        {showLocalePicker ? (
          <div className="flex items-center gap-2">
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

        <div className="flex flex-col gap-4">
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className={cn(
                'flex flex-col gap-3 rounded-md border p-3',
                row.status === 'error' && 'border-destructive',
                row.status === 'done' && 'border-emerald-500/50 opacity-80',
              )}
            >
              {!singleFile ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {row.status === 'done'
                    ? t('shadcnAdmin:fileRowUploaded', { number: idx + 1 })
                    : row.status === 'uploading'
                      ? t('shadcnAdmin:fileRowUploading', { number: idx + 1 })
                      : t('shadcnAdmin:fileRow', { number: idx + 1 })}
                </span>
              ) : null}

              <DropzoneInput
                value={row.file}
                onChange={(f) => (f ? replaceFile(row.id, f) : removeRow(row.id))}
                mimeTypes={uploadConfig?.mimeTypes}
                maxFileSize={uploadConfig?.maxFileSize}
                disabled={submitting || row.status === 'done'}
              />

              {collectionFields.length > 0 ? (
                <UploadRowForm
                  rowId={row.id}
                  collectionSlug={collectionSlug}
                  collectionFields={collectionFields}
                  values={row.values}
                  errors={row.errors}
                  onValuesChange={(next) => setRowValues(row.id, next)}
                  onErrorClear={(path) => clearRowError(row.id, path)}
                  useAsTitleBySlug={useAsTitleBySlug}
                  uploadCollectionsBySlug={uploadCollectionsBySlug}
                  activeLocale={activeLocale}
                  localizationEnabled={localizationEnabled}
                  disabled={submitting || row.status === 'done'}
                />
              ) : null}

              {row.topError ? (
                <p className="text-xs text-destructive">{row.topError}</p>
              ) : null}
            </div>
          ))}

          {canAddMore ? (
            <DropzoneInput
              value={null}
              onChange={(f) => (f ? addFiles([f]) : undefined)}
              onMultiDrop={(files) => addFiles(Array.from(files))}
              multiple={!singleFile}
              mimeTypes={uploadConfig?.mimeTypes}
              maxFileSize={uploadConfig?.maxFileSize}
              disabled={submitting}
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('general:cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleUpload()
            }}
            disabled={submitting || rows.length === 0}
          >
            {submitting
              ? `${t('general:uploading')}…`
              : rows.length > 1
                ? t('shadcnAdmin:uploadFilesCount', { count: rows.length })
                : t('shadcnAdmin:uploadSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

/* Self-contained shadcn dropzone for upload-collection files and
   upload-field "upload new" flows. Renders a click-to-pick input plus
   drag-and-drop affordance, validates against the collection's mimeTypes
   and maxFileSize client-side, and shows one of three preview states:
   newly-picked file (createObjectURL), existing saved doc (url/thumbnailURL),
   or empty prompt.

   Multi-file drop dispatches via `onMultiDrop` instead of setting `value` —
   the collection-level header opens the bulk-upload drawer in that path.

   Crop / focal-point editing is delegated upward via `onEditOpen` so the
   caller can mount Payload's <EditUpload/> inside whatever modal primitive
   it prefers. */

import * as React from 'react'
import { FileIcon, ImageIcon, PencilIcon, RefreshCwIcon, XIcon } from 'lucide-react'
import { useTranslation } from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Button } from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'

export type DropzoneExisting = {
  url: string
  thumbnailURL?: string | null
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
  width?: number | null
  height?: number | null
}

export type DropzoneInputProps = {
  id?: string
  value: File | null
  onChange: (next: File | null) => void
  existing?: DropzoneExisting | null
  mimeTypes?: string[]
  /** Bytes. */
  maxFileSize?: number
  /** Accept multiple files on the picker / drop. Multi-drop dispatches
   *  via `onMultiDrop` and does NOT set value. */
  multiple?: boolean
  onMultiDrop?: (files: FileList) => void
  cropEnabled?: boolean
  focalPointEnabled?: boolean
  /** Trigger the EditUpload modal in the parent (which owns the file/url
   *  the editor should operate on). */
  onEditOpen?: () => void
  disabled?: boolean
  invalid?: boolean
}

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const isImageMime = (mt?: string | null): boolean =>
  Boolean(mt && mt.startsWith('image/'))

/* mimeTypes can include wildcards (`image/*`) and extension shorthands
   (`.pdf`). Mirror what Payload uses for the picker `accept` attribute. */
const matchesMime = (file: File, mimeTypes?: string[]): boolean => {
  if (!mimeTypes || mimeTypes.length === 0) return true
  const fileType = file.type
  const fileName = file.name.toLowerCase()
  for (const allowed of mimeTypes) {
    if (allowed.startsWith('.')) {
      if (fileName.endsWith(allowed.toLowerCase())) return true
      continue
    }
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -1)
      if (fileType.startsWith(prefix)) return true
      continue
    }
    if (fileType === allowed) return true
  }
  return false
}

export function DropzoneInput({
  id,
  value,
  onChange,
  existing,
  mimeTypes,
  maxFileSize,
  multiple,
  onMultiDrop,
  cropEnabled,
  focalPointEnabled,
  onEditOpen,
  disabled,
  invalid,
}: DropzoneInputProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const [dragOver, setDragOver] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Object URL for the newly-picked file preview; revoked when value changes
  // or component unmounts.
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (value && isImageMime(value.type)) {
      const url = URL.createObjectURL(value)
      setObjectUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setObjectUrl(null)
    return undefined
  }, [value])

  const validate = (file: File): string | null => {
    if (!matchesMime(file, mimeTypes)) {
      return `File type "${file.type || file.name}" not allowed${
        mimeTypes && mimeTypes.length > 0 ? ` (accepted: ${mimeTypes.join(', ')})` : ''
      }.`
    }
    if (typeof maxFileSize === 'number' && file.size > maxFileSize) {
      return `File too large (${formatBytes(file.size)} > ${formatBytes(maxFileSize)}).`
    }
    return null
  }

  const acceptFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (multiple && files.length > 1 && onMultiDrop) {
      onMultiDrop(files)
      setError(null)
      return
    }
    const file = files[0]
    const err = validate(file)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    onChange(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    acceptFiles(e.dataTransfer?.files ?? null)
  }

  const acceptAttr = (mimeTypes ?? []).join(',') || undefined
  const showExisting = !value && existing && existing.url

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'relative flex flex-col items-stretch overflow-hidden rounded-md border border-dashed bg-muted/20 transition-colors',
          dragOver ? 'border-ring bg-muted/40' : 'border-input',
          (error || invalid) && 'border-destructive',
          disabled && 'opacity-50',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          if (disabled) return
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => acceptFiles(e.target.files)}
        />

        {value ? (
          <FilePreview
            file={value}
            objectUrl={objectUrl}
            onClear={() => {
              onChange(null)
              setError(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            onReplace={() => inputRef.current?.click()}
            onEdit={
              onEditOpen && (cropEnabled || focalPointEnabled) && isImageMime(value.type)
                ? onEditOpen
                : undefined
            }
            disabled={disabled}
          />
        ) : showExisting ? (
          <ExistingPreview
            existing={existing!}
            onReplace={() => inputRef.current?.click()}
            onClear={() => {
              // Clearing the EXISTING file isn't supported in v3.5 (would
              // require sending a sentinel to the server; instead the user
              // can delete the doc). Just kick the picker open.
              inputRef.current?.click()
            }}
            onEdit={
              onEditOpen && (cropEnabled || focalPointEnabled) && isImageMime(existing!.mimeType)
                ? onEditOpen
                : undefined
            }
            disabled={disabled}
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground hover:text-foreground"
          >
            <ImageIcon className="size-8" />
            <span>
              <span className="font-medium text-foreground">
                {t('shadcnAdmin:clickToPick')}
              </span>{' '}
              {t('shadcnAdmin:orDragFileHere')}
            </span>
            {mimeTypes && mimeTypes.length > 0 ? (
              <span className="text-xs">{mimeTypes.join(', ')}</span>
            ) : null}
            {typeof maxFileSize === 'number' ? (
              <span className="text-xs">
                {t('shadcnAdmin:dropzoneMax', {
                  size: formatBytes(maxFileSize),
                })}
              </span>
            ) : null}
          </button>
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function FilePreview({
  file,
  objectUrl,
  onClear,
  onReplace,
  onEdit,
  disabled,
}: {
  file: File
  objectUrl: string | null
  onClear: () => void
  onReplace: () => void
  onEdit?: () => void
  disabled?: boolean
}): React.ReactElement {
  const isImg = isImageMime(file.type) && objectUrl
  return (
    <div className="flex items-center gap-4 p-3">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-background">
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={objectUrl!} alt={file.name} className="size-full object-contain" />
        ) : (
          <FileIcon className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {file.type || 'unknown'} · {formatBytes(file.size)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onEdit ? (
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onEdit}>
            <PencilIcon className="size-3.5" />
            <span className="ml-1">Edit</span>
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onReplace}>
          <RefreshCwIcon className="size-3.5" />
          <span className="ml-1">Replace</span>
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onClear}>
          <XIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

function ExistingPreview({
  existing,
  onReplace,
  onClear: _onClear,
  onEdit,
  disabled,
}: {
  existing: DropzoneExisting
  onReplace: () => void
  onClear: () => void
  onEdit?: () => void
  disabled?: boolean
}): React.ReactElement {
  const isImg = isImageMime(existing.mimeType)
  const src = existing.thumbnailURL ?? existing.url
  return (
    <div className="flex items-center gap-4 p-3">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-background">
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={existing.filename ?? ''} className="size-full object-contain" />
        ) : (
          <FileIcon className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{existing.filename ?? existing.url}</p>
        <p className="text-xs text-muted-foreground">
          {existing.mimeType ?? 'unknown'}
          {typeof existing.filesize === 'number' ? ` · ${formatBytes(existing.filesize)}` : ''}
          {existing.width && existing.height ? ` · ${existing.width}×${existing.height}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onEdit ? (
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onEdit}>
            <PencilIcon className="size-3.5" />
            <span className="ml-1">Edit</span>
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onReplace}>
          <RefreshCwIcon className="size-3.5" />
          <span className="ml-1">Replace</span>
        </Button>
      </div>
    </div>
  )
}

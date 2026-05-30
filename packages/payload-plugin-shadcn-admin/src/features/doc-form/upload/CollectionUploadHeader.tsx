'use client'

/* Header region rendered above the field list for upload-collection create
   and edit views (when `collection.upload` is set). Owns the dropzone, the
   <EditUpload/> crop/focal-point dialog (lifted directly from @payloadcms/ui
   — self-contained per pre-research, no provider deps), and the bulk-upload
   drawer wiring for multi-file drops on the create view.

   File / edits state is owned by the bridge and passed in via props; this
   component is the visible surface. */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { EditUpload } from '../../../internal/payloadAdapter.js'
import type { UploadEdits } from '../../../internal/payloadAdapter.js'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from 'payload-plugin-shadcn-ui'
import {
  DropzoneInput,
  type DropzoneExisting,
} from '../inputs/DropzoneInput.js'
import type {
  ExtractedCollection,
  ExtractedUploadConfig,
} from 'payload-plugin-shadcn-ui'
import { UploadNewDialog } from './UploadNewDialog.js'

export type CollectionUploadHeaderProps = {
  mode: 'create' | 'edit'
  collectionSlug: string
  uploadConfig: ExtractedUploadConfig
  uploadCollectionsBySlug?: Record<string, ExtractedCollection>
  useAsTitleBySlug?: Record<string, string | undefined>
  existing?: DropzoneExisting | null
  pendingFile: File | null
  onPendingFileChange: (next: File | null) => void
  uploadEdits: UploadEdits | null
  onUploadEditsChange: (next: UploadEdits | null) => void
  disabled?: boolean
  invalid?: boolean
}

export function CollectionUploadHeader({
  mode,
  collectionSlug,
  uploadConfig,
  uploadCollectionsBySlug = {},
  useAsTitleBySlug = {},
  existing,
  pendingFile,
  onPendingFileChange,
  uploadEdits,
  onUploadEditsChange,
  disabled,
  invalid,
}: CollectionUploadHeaderProps): React.ReactElement {
  const router = useRouter()

  const [editOpen, setEditOpen] = React.useState(false)
  // Multi-file drops open the custom UploadNewDialog seeded with the dropped
  // files (replacing Payload's native BulkUploadDrawer).
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [bulkFiles, setBulkFiles] = React.useState<File[]>([])

  // Build the EditUpload payload from either the pending file (objectURL +
  // file.name) or the existing saved doc (url + filename). EditUpload reads
  // the image from `fileSrc` directly, so an object URL works the same as
  // a remote URL. Tracked in state (not a ref-in-memo) so React's
  // effect-cleanup contract reliably revokes the URL — important under
  // StrictMode where render-phase side effects fire twice.
  const [editInputs, setEditInputs] = React.useState<
    { fileName: string; fileSrc: string } | null
  >(null)

  React.useEffect(() => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile)
      setEditInputs({ fileName: pendingFile.name, fileSrc: url })
      return () => URL.revokeObjectURL(url)
    }
    if (existing?.url) {
      setEditInputs({
        fileName: existing.filename ?? 'file',
        fileSrc: existing.url,
      })
      return undefined
    }
    setEditInputs(null)
    return undefined
  }, [pendingFile, existing?.url, existing?.filename])

  const handleMultiDrop = React.useCallback((files: FileList) => {
    setBulkFiles(Array.from(files))
    setBulkOpen(true)
  }, [])

  const editEnabled = Boolean(uploadConfig.crop || uploadConfig.focalPoint)

  return (
    <section className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <h2 className="text-sm font-medium">File</h2>
      <DropzoneInput
        value={pendingFile}
        onChange={(f) => {
          onPendingFileChange(f)
          // Picking a new file invalidates prior crop/focal edits.
          if (uploadEdits) onUploadEditsChange(null)
        }}
        existing={existing}
        mimeTypes={uploadConfig.mimeTypes}
        maxFileSize={uploadConfig.maxFileSize}
        multiple={mode === 'create'}
        onMultiDrop={mode === 'create' ? handleMultiDrop : undefined}
        cropEnabled={uploadConfig.crop}
        focalPointEnabled={uploadConfig.focalPoint}
        onEditOpen={editEnabled ? () => setEditOpen(true) : undefined}
        disabled={disabled}
        invalid={invalid}
      />

      {editEnabled && editInputs ? (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit upload</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto">
              <EditUpload
                fileName={editInputs.fileName}
                fileSrc={editInputs.fileSrc}
                initialCrop={
                  (uploadEdits?.crop as UploadEdits['crop']) ??
                  (existing as { crop?: UploadEdits['crop'] } | undefined)?.crop
                }
                initialFocalPoint={
                  uploadEdits?.focalPoint ??
                  (existing as { focalPoint?: { x: number; y: number } } | undefined)?.focalPoint
                }
                showCrop={Boolean(uploadConfig.crop)}
                showFocalPoint={Boolean(uploadConfig.focalPoint)}
                onSave={(edits) => {
                  onUploadEditsChange(edits)
                  setEditOpen(false)
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <UploadNewDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        collectionSlug={collectionSlug}
        uploadCollectionsBySlug={uploadCollectionsBySlug}
        useAsTitleBySlug={useAsTitleBySlug}
        maxFiles={0}
        initialFiles={bulkFiles}
        onSuccess={() => {
          // After the dialog creates docs, navigate to the collection list so
          // users see what landed.
          router.push(`/admin/collections/${collectionSlug}`)
        }}
      />
    </section>
  )
}

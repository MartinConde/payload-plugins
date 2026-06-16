'use client'

/* Gallery field input — a drag-and-drop thumbnail grid where every entry has
   an image (from an upload collection) and a per-entry caption rendered via
   renderChild (so localization + validation are preserved).

   This component is registered as a `custom['plugin-shadcn-admin'].input`
   override on a Payload `array` field (via `galleryField()` in
   `src/fields/galleryField.ts`). It receives the full FieldInputProps contract
   from the bridge and replaces the default ArrayInput card list with a compact
   grid UI.

   Sub-field detection: instead of hardcoding field names, the component reads
   `field.fields` to find the first `type:'upload'` sub-field (the image) and
   the first `type:'text'` sub-field (the caption). That makes `galleryField()`
   rename-safe — you can call it with `name: 'bilder'` and sub-fields named
   anything you like, and the gallery will still find them.

   Storage shape is identical to a standard Payload array:
     [{ id, <imageFieldName>: "<docId>", <captionFieldName>: "…" }, …]
   So existing array data is compatible out of the box. */

import * as React from 'react'
import { GripVerticalIcon, UploadIcon, XIcon } from 'lucide-react'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useTranslation } from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Button } from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'

import { MediaPickerDialog } from '../upload/MediaPickerDialog.js'
import {
  UploadNewDialog,
  type UploadCreated,
} from '../upload/UploadNewDialog.js'
import type { FieldInputProps } from '../inputs/FieldInput.js'
import { coerceRelationshipValue } from '../inputs/relationshipId.js'

// ── local types ──────────────────────────────────────────────────────────────

type Row = { id: string; [key: string]: unknown }

type LoadedDoc = {
  id: string
  url: string | null
  thumbnailURL: string | null
  filename: string | null
  mimeType: string | null
}

// ── helpers (module-local, same as ArrayInput) ────────────────────────────────

const ensureRowId = (row: Record<string, unknown>): Row => {
  const id =
    typeof row.id === 'string'
      ? row.id
      : typeof row.id === 'number'
        ? String(row.id)
        : (globalThis.crypto?.randomUUID?.() ??
          `row-${Math.random().toString(36).slice(2, 10)}`)
  return { ...row, id } as Row
}

/** Extract the string ID from an image field value that may be a plain ID
 *  string, a numeric ID, or a populated doc object `{ id, … }`. */
const extractImageId = (v: unknown): string | null => {
  if (typeof v === 'string' && v.length > 0) return v
  if (typeof v === 'number') return String(v)
  if (v && typeof v === 'object' && 'id' in (v as Record<string, unknown>)) {
    const id = (v as Record<string, unknown>).id
    if (typeof id === 'string' || typeof id === 'number') return String(id)
  }
  return null
}

/* Coerce a row's image field to a scalar ID (string for UUID collections,
   number for integer-ID collections such as D1/SQLite). This mirrors what
   FieldInput does for standalone upload fields via coerceRelationshipValue —
   since the gallery bypasses that layer entirely, we must do it ourselves
   whenever we emit rows via onChange. Populated doc objects ({ id, url, … })
   from the initial doc load are also collapsed to their id here. */
const normalizeRowImage = (row: Row, imageFieldName: string): Row => {
  const raw = row[imageFieldName]
  const strId = extractImageId(raw)
  if (strId === null) return row
  const coerced = coerceRelationshipValue(strId)
  return coerced === raw ? row : { ...row, [imageFieldName]: coerced }
}

const makeImageRow = (imageFieldName: string, imageId: string): Row => {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `row-${Math.random().toString(36).slice(2, 10)}`,
    [imageFieldName]: coerceRelationshipValue(imageId),
  } as Row
}

// ── main component ────────────────────────────────────────────────────────────

export function GalleryArrayInput({
  field,
  value,
  onChange,
  nestedPath = '',
  renderChild,
  useAsTitleBySlug,
  uploadCollectionsBySlug = {},
  fieldPerms,
  disabled,
}: FieldInputProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()

  // ── sub-field detection ─────────────────────────────────────────────────────
  const subfields = field.fields ?? []
  const imageField = subfields.find((s) => s.type === 'upload')
  const captionField = subfields.find((s) => s.type === 'text')
  const imageFieldName = imageField?.name ?? 'image'
  const mediaSlug = (() => {
    const rt = imageField?.relationTo
    if (typeof rt === 'string') return rt
    if (Array.isArray(rt) && rt.length > 0 && typeof rt[0] === 'string') return rt[0]
    return 'media'
  })()
  const useAsTitle = useAsTitleBySlug[mediaSlug]

  // ── rows — re-derived from value each render, keyed by row.id ──────────────
  const rows = React.useMemo<Row[]>(() => {
    if (!Array.isArray(value)) return []
    return value.map((r) =>
      r && typeof r === 'object'
        ? ensureRowId(r as Record<string, unknown>)
        : ensureRowId({}),
    )
  }, [value])

  // ── thumbnail batch-fetch ───────────────────────────────────────────────────
  const [loaded, setLoaded] = React.useState<Map<string, LoadedDoc>>(new Map())
  // Build a stable key from the current image IDs to drive the effect.
  const imageIds = rows
    .map((r) => extractImageId(r[imageFieldName]))
    .filter((id): id is string => id !== null)
  const idsKey = imageIds.join(',')

  React.useEffect(() => {
    // Only fetch IDs not yet in the cache.
    const missing = imageIds.filter((id) => !loaded.has(`${mediaSlug}:${id}`))
    if (missing.length === 0) return
    let cancelled = false
    void (async () => {
      const params = new URLSearchParams()
      for (const id of missing) params.append('where[id][in][]', id)
      params.set('limit', String(missing.length))
      params.set('depth', '0')
      try {
        const res = await fetch(`/api/${mediaSlug}?${params.toString()}`, {
          credentials: 'include',
        })
        if (!res.ok || cancelled) return
        const body = (await res.json()) as { docs?: any[] }
        if (cancelled) return
        setLoaded((prev) => {
          const next = new Map(prev)
          for (const d of body.docs ?? []) {
            const id = String(d.id)
            next.set(`${mediaSlug}:${id}`, {
              id,
              url: typeof d.url === 'string' ? d.url : null,
              thumbnailURL:
                typeof d.thumbnailURL === 'string' ? d.thumbnailURL : null,
              filename: typeof d.filename === 'string' ? d.filename : null,
              mimeType: typeof d.mimeType === 'string' ? d.mimeType : null,
            })
          }
          return next
        })
      } catch {
        // ignore — tiles show the UploadIcon fallback while offline / on error
      }
    })()
    return () => {
      cancelled = true
    }
    // `loaded` intentionally omitted: read for "missing" but should not
    // trigger the effect on every cache update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, mediaSlug])

  // ── dnd-kit sensors (same as ArrayInput) ───────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Normalize image IDs before emitting rows. Collapses populated doc objects
  // to plain scalars and coerces integer-string IDs to numbers (required for
  // D1/SQLite where isValidID checks typeof === 'number'). Existing rows from
  // the server load may carry populated objects; new rows from the picker
  // already go through makeImageRow (which coerces), but normalizing all rows
  // here ensures consistency regardless of origin.
  const emitRows = React.useCallback(
    (nextRows: Row[]) =>
      onChange(nextRows.map((r) => normalizeRowImage(r, imageFieldName))),
    [onChange, imageFieldName],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((r) => r.id === active.id)
    const newIndex = rows.findIndex((r) => r.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    emitRows(arrayMove(rows, oldIndex, newIndex))
  }

  // ── add from library ────────────────────────────────────────────────────────
  const handlePickFromLibrary = (picked: string | string[] | null) => {
    if (!picked) return
    const ids = Array.isArray(picked) ? picked : [picked]
    if (ids.length === 0) return
    const newRows = ids.map((id) => makeImageRow(imageFieldName, id))
    emitRows([...rows, ...newRows])
  }

  // ── upload new ──────────────────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const handleUploadSuccess = React.useCallback(
    (created: UploadCreated[]) => {
      const newRows = created.map((c) => makeImageRow(imageFieldName, String(c.id)))
      if (newRows.length > 0) emitRows([...rows, ...newRows])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imageFieldName, rows, emitRows],
  )

  // ── remove ──────────────────────────────────────────────────────────────────
  const removeRow = (rowId: string) =>
    emitRows(rows.filter((r) => r.id !== rowId))

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Grid */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('shadcnAdmin:noGalleryItems')}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {rows.map((row, idx) => {
                const imageId = extractImageId(row[imageFieldName])
                const doc = imageId ? loaded.get(`${mediaSlug}:${imageId}`) : undefined
                const src = doc?.thumbnailURL ?? doc?.url ?? null
                const isImg = doc?.mimeType?.startsWith('image/')

                return (
                  <GalleryTile
                    key={row.id}
                    rowId={row.id}
                    src={isImg ? src : null}
                    filename={doc?.filename ?? null}
                    disabled={disabled}
                    onRemove={() => removeRow(row.id)}
                    dragAriaLabel={t('shadcnAdmin:dragToReorder')}
                    removeAriaLabel={t('shadcnAdmin:removeRow')}
                  >
                    {captionField && renderChild
                      ? renderChild(
                          captionField,
                          `${nestedPath}.${idx}.`,
                          fieldPerms,
                        )
                      : null}
                  </GalleryTile>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add affordances — every row is born with an image, so no "add empty row" */}
      <div className="flex flex-wrap gap-2">
        <MediaPickerDialog
          relatedSlug={mediaSlug}
          useAsTitle={useAsTitle}
          multi
          value={null}
          onChange={handlePickFromLibrary}
          disabled={disabled}
          triggerLabel={t('shadcnAdmin:addFromLibrary')}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setUploadOpen(true)}
        >
          <UploadIcon className="size-3.5" />
          <span className="ml-1">{t('shadcnAdmin:uploadNew')}</span>
        </Button>
      </div>

      <UploadNewDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        collectionSlug={mediaSlug}
        uploadCollectionsBySlug={uploadCollectionsBySlug}
        useAsTitleBySlug={useAsTitleBySlug}
        maxFiles={0}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}

// ── GalleryTile (sortable tile with drag/remove overlays) ─────────────────────

function GalleryTile({
  rowId,
  src,
  filename,
  disabled,
  onRemove,
  dragAriaLabel,
  removeAriaLabel,
  children,
}: {
  rowId: string
  src: string | null
  filename: string | null
  disabled?: boolean
  onRemove: () => void
  dragAriaLabel: string
  removeAriaLabel: string
  children: React.ReactNode
}): React.ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-md border bg-card',
        isDragging && 'z-10',
      )}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={filename ?? ''}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <UploadIcon className="size-8 text-muted-foreground" />
          </div>
        )}

        {/* Drag handle — top-left overlay */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className={cn(
            'absolute left-1 top-1 flex size-6 cursor-grab items-center justify-center',
            'rounded bg-background/70 text-muted-foreground hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          aria-label={dragAriaLabel}
        >
          <GripVerticalIcon className="size-4" />
        </button>

        {/* Remove button — top-right overlay */}
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className={cn(
            'absolute right-1 top-1 flex size-6 items-center justify-center',
            'rounded bg-background/70 text-muted-foreground hover:text-destructive',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          aria-label={removeAriaLabel}
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      {/* Caption / child fields */}
      {children ? <div className="p-2">{children}</div> : null}
    </div>
  )
}

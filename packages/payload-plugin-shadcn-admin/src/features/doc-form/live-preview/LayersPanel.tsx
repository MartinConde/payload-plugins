'use client'

/* Page-structure overview for the Live Preview page-builder layer (Pass 3,
   Phase 2a of PAGE-BUILDER-PLAN.md). Lists every `layout` row so an editor
   can find/reorder a block without hunting for it in the iframe.

   Deliberately a plain flex column, NOT a 3rd `ResizablePanel` alongside
   the (preview | settings) group in AutoDocFormBridge — that group is
   already a NESTED 2-panel group specifically because
   `react-resizable-panels`' imperative `resize()` only trades space with
   ONE adjacent sibling (see `blockSettingsPanelRef`'s doc comment there). A
   3rd flat sibling here would reintroduce that same pivot-index bug the
   instant anything tried to imperatively resize a non-adjacent panel. A
   fixed-width column costs nothing extra and sidesteps the whole class of
   bug.

   Reads/writes exactly like `BlocksInput`'s own DnD wiring (same
   `DndContext`/`SortableContext`/`arrayMove` shape) and the same
   `deriveRowPreview` label derivation used for collapsed rows there — this
   is not a new pattern, just that pattern pointed at a compact read-mostly
   list instead of an editable one. `onReorder`/`onDuplicate`/`onDelete` are
   owned by the bridge (it already has `setValueAtPath` + `layoutRows`), so
   this component only ever calls back out; it never touches form state
   itself. Selection comes from the same `PageBuilderContext` the preview
   panel and settings panel already share, so clicking a row here rides the
   existing `highlight` mirror into the iframe for free. */

import * as React from 'react'
import { CopyIcon, GripVerticalIcon, TrashIcon } from 'lucide-react'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useTranslation } from '../../../internal/payloadAdapter.js'
import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Badge, cn, usePageBuilder } from 'payload-plugin-shadcn-ui'
import type { ExtractedBlock } from 'payload-plugin-shadcn-ui'
import type { BlockRow } from '../inputs/BlocksInput.js'
import { deriveRowPreview } from '../inputs/rowCollapse.js'

const blockLabelOf = (block: ExtractedBlock): string => {
  if (block.labels?.singular && block.labels.singular.length > 0)
    return block.labels.singular
  return block.slug
}

export type LayersPanelProps = {
  /** Same normalized rows the bridge computes for `BlockSettingsPanel`. */
  rows: BlockRow[]
  blocks: ExtractedBlock[]
  /** Full replacement array — mirrors `BlocksInput`'s `onChange`, i.e. the
   *  bridge does `setValueAtPath(layoutBasePath, next)` with this. */
  onReorder: (next: BlockRow[]) => void
  onDuplicate: (blockId: string) => void
  onDelete: (blockId: string) => void
  disabled?: boolean
}

export function LayersPanel({
  rows,
  blocks,
  onReorder,
  onDuplicate,
  onDelete,
  disabled,
}: LayersPanelProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const { selectedBlockId, setSelectedBlockId } = usePageBuilder()

  const blockBySlug = React.useMemo<Record<string, ExtractedBlock>>(() => {
    const out: Record<string, ExtractedBlock> = {}
    for (const b of blocks) out[b.slug] = b
    return out
  }, [blocks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((r) => r.id === active.id)
    const newIndex = rows.findIndex((r) => r.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(rows, oldIndex, newIndex))
  }

  return (
    <div className="flex h-full w-56 shrink-0 flex-col gap-2 overflow-y-auto border-r bg-muted/20 pr-3">
      <div className="flex items-center justify-between px-1 pt-0.5">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t('shadcnAdmin:layersPanel')}
        </span>
        {rows.length > 0 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground/70">
            {rows.length}
          </span>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          {t('shadcnAdmin:noBlocks')}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1">
              {rows.map((row, idx) => {
                const block = blockBySlug[row.blockType]
                return (
                  <LayerRow
                    key={row.id}
                    row={row}
                    index={idx}
                    label={block ? blockLabelOf(block) : row.blockType || 'Unknown'}
                    preview={block ? deriveRowPreview(block.fields, row) : undefined}
                    selected={row.id === selectedBlockId}
                    disabled={disabled}
                    onSelect={() => setSelectedBlockId(row.id)}
                    onDuplicate={() => onDuplicate(row.id)}
                    onDelete={() => onDelete(row.id)}
                    dragLabel={t('shadcnAdmin:dragToReorder')}
                    duplicateLabel={t('shadcnAdmin:duplicateBlock')}
                    deleteLabel={t('shadcnAdmin:deleteBlock')}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function LayerRow({
  row,
  index,
  label,
  preview,
  selected,
  disabled,
  onSelect,
  onDuplicate,
  onDelete,
  dragLabel,
  duplicateLabel,
  deleteLabel,
}: {
  row: BlockRow
  index: number
  label: string
  preview?: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  dragLabel: string
  duplicateLabel: string
  deleteLabel: string
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-1 rounded-md border px-1 py-1.5 transition-colors',
        selected
          ? 'border-primary/40 bg-accent ring-1 ring-primary/40'
          : 'border-transparent hover:bg-accent/50',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={dragLabel}
        className="flex shrink-0 cursor-grab text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GripVerticalIcon className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs"
      >
        <span className="shrink-0 text-muted-foreground">#{index + 1}</span>
        <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
          {label}
        </Badge>
        {preview ? (
          <span className="truncate text-muted-foreground/60">{preview}</span>
        ) : null}
      </button>
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
          selected && 'opacity-100',
        )}
      >
        <button
          type="button"
          onClick={onDuplicate}
          disabled={disabled}
          aria-label={duplicateLabel}
          title={duplicateLabel}
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CopyIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          aria-label={deleteLabel}
          title={deleteLabel}
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TrashIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

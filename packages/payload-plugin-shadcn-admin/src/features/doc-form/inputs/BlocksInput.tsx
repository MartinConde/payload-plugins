'use client'

/* Blocks field input. Payload stores blocks as [{ id, blockType, ...subfields }]
   on disk and REST PATCH replaces the entire blocks array (same as array — no
   per-row partial). Each row's blockType picks which of field.blocks[] to
   render its subfields from.

   Rows start collapsed on initial render; newly-added blocks open expanded.
   A "Collapse all / Expand all" pair appears above the list when >1 row. */

import * as React from 'react'
import { PlusIcon } from 'lucide-react'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { useTranslation } from '../../../internal/payloadAdapterUI.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Button } from 'payload-plugin-shadcn-ui'
import { Badge } from 'payload-plugin-shadcn-ui'
import type {
  ExtractedBlock,
  ExtractedField,
} from 'payload-plugin-shadcn-ui'
import { SortableRow } from './ArrayInput.js'
import { BlockPickerSheet } from './BlockPickerSheet.js'
import type { Perms } from '../access-control/fieldPermissions.js'
import {
  deriveRowPreview,
  RowCollapseControls,
  useRowCollapse,
} from './rowCollapse.js'

export type BlockRow = { id: string; blockType: string; [key: string]: unknown }

/** Builds a fresh row for `block`: a random `id`, `blockType: block.slug`, and
 *  each subfield's `defaultValue` (undefined ones are simply absent, matching
 *  how Payload itself omits unset fields rather than writing explicit nulls).
 *  Exported so the page-builder's "add block" action (driven from the Live
 *  Preview toolbar, not this component) constructs new rows the same way. */
export const newRow = (block: ExtractedBlock): BlockRow => {
  const row: Record<string, unknown> = {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `block-${Math.random().toString(36).slice(2, 10)}`,
    blockType: block.slug,
  }
  for (const sub of block.fields) {
    if (!sub.name) continue
    if (sub.defaultValue !== undefined) row[sub.name] = sub.defaultValue
  }
  return row as BlockRow
}

/** Defensively normalizes a raw layout row to `{id, blockType, ...}` (a legacy
 *  row missing an `id`, or with a numeric one, gets a stable string id).
 *  Exported so the page-builder settings panel normalizes `values.layout`
 *  the same way this component does, keeping both readings of the array
 *  in agreement on row identity. */
export const ensureRowId = (row: Record<string, unknown>): BlockRow => {
  const id =
    typeof row.id === 'string'
      ? row.id
      : typeof row.id === 'number'
        ? String(row.id)
        : (globalThis.crypto?.randomUUID?.() ??
          `block-${Math.random().toString(36).slice(2, 10)}`)
  return {
    ...row,
    id,
    blockType: typeof row.blockType === 'string' ? row.blockType : '',
  } as BlockRow
}

const blockLabelOf = (block: ExtractedBlock): string => {
  if (block.labels?.singular && block.labels.singular.length > 0)
    return block.labels.singular
  return block.slug
}

export type BlocksInputProps = {
  id?: string
  field: ExtractedField
  value: unknown
  onChange: (next: BlockRow[]) => void
  nestedPath: string
  renderChild: (
    child: ExtractedField,
    pathPrefix: string,
    parentPerms?: unknown,
    inheritedReadOnly?: boolean,
  ) => React.ReactNode
  disabled?: boolean
  /** v3.7: the FieldPermissions object for this blocks field itself; its
   *  `.blocks[slug].fields` map gates per-block subfields. */
  blockPerms?: Perms
}

export function BlocksInput({
  id,
  field,
  value,
  onChange,
  nestedPath,
  renderChild,
  disabled,
  blockPerms,
}: BlocksInputProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const blocks = field.blocks ?? []
  const rows = React.useMemo<BlockRow[]>(() => {
    if (!Array.isArray(value)) return []
    return value.map((r) =>
      r && typeof r === 'object'
        ? ensureRowId(r as Record<string, unknown>)
        : ensureRowId({}),
    )
  }, [value])

  const blockBySlug = React.useMemo<Record<string, ExtractedBlock>>(() => {
    const out: Record<string, ExtractedBlock> = {}
    for (const b of blocks) out[b.slug] = b
    return out
  }, [blocks])

  const [pickerOpen, setPickerOpen] = React.useState(false)

  const { isCollapsed, toggle, collapseAll, expandAll, markExpanded } =
    useRowCollapse(rows.map((r) => r.id))

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
    onChange(arrayMove(rows, oldIndex, newIndex))
  }

  const addBlock = (slug: string) => {
    const block = blockBySlug[slug]
    if (!block) return
    const row = newRow(block)
    markExpanded(row.id)
    onChange([...rows, row])
  }
  const removeRow = (rowId: string) => {
    onChange(rows.filter((r) => r.id !== rowId))
  }

  return (
    <div id={id} className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t('shadcnAdmin:noBlocks')}
        </p>
      ) : (
        <>
          {rows.length > 1 && (
            <RowCollapseControls
              onCollapseAll={collapseAll}
              onExpandAll={expandAll}
            />
          )}
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
              <div className="flex flex-col gap-2">
                {rows.map((row, idx) => {
                  const block = blockBySlug[row.blockType]
                  return (
                    <SortableRow
                      key={row.id}
                      row={row}
                      index={idx}
                      collapsed={isCollapsed(row.id)}
                      onToggleCollapse={() => toggle(row.id)}
                      summary={
                        block
                          ? deriveRowPreview(block.fields, row)
                          : undefined
                      }
                      disabled={disabled}
                      onRemove={() => removeRow(row.id)}
                      header={
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {block ? blockLabelOf(block) : row.blockType || 'Unknown'}
                        </Badge>
                      }
                    >
                      {block
                        ? block.fields.map((sub) => {
                            // Per-block sub-perms: blocks[slug].fields gates
                            // each block's subfields independently.
                            const perBlockPerms = blockPerms
                              ? (blockPerms as {
                                  blocks?: Record<string, unknown>
                                }).blocks?.[row.blockType]
                              : undefined
                            return renderChild(
                              sub,
                              `${nestedPath}.${idx}.`,
                              perBlockPerms,
                              // Cascade a read-only/disabled blocks field to its
                              // block subfields (see ArrayInput for rationale).
                              disabled,
                            )
                          })
                        : null}
                    </SortableRow>
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
      <div className="flex flex-row items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          disabled={disabled || blocks.length === 0}
        >
          <PlusIcon className="size-3" />
          {t('shadcnAdmin:addBlock')}
        </Button>
      </div>
      <BlockPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        blocks={blocks}
        onSelect={addBlock}
      />
    </div>
  )
}

'use client'

/* Array field input. Payload stores arrays as [{ id, ...subfields }] on disk
   and REST PATCH replaces the entire array (no per-row partial updates), so
   this input always emits the full next-array via onChange. The bridge
   serializes the whole array to the wire when any row's subfield is dirty.

   Each row is a shadcn-styled card with a drag handle (dnd-kit), delete
   button, and the row's subfields rendered via the bridge's renderChild
   callback (which dispatches each subfield back through FieldInput, allowing
   nested arrays/blocks/group/tabs to recurse).

   Rows start collapsed on initial render; new rows are added expanded.
   A "Collapse all / Expand all" pair appears above the list when >1 row. */

import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react'
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
import { Button } from 'payload-plugin-shadcn-ui'
import { Card, CardContent } from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import type { ExtractedField } from 'payload-plugin-shadcn-ui'

import {
  deriveRowPreview,
  RowCollapseControls,
  useRowCollapse,
} from './rowCollapse.js'

type Row = { id: string; [key: string]: unknown }

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

const seedRowDefaults = (subfields: ExtractedField[]): Row => {
  const row: Record<string, unknown> = {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `row-${Math.random().toString(36).slice(2, 10)}`,
  }
  for (const sub of subfields) {
    if (!sub.name) continue
    if (sub.defaultValue !== undefined) row[sub.name] = sub.defaultValue
  }
  return row as Row
}

export type ArrayInputProps = {
  id?: string
  field: ExtractedField
  value: unknown
  onChange: (next: Row[]) => void
  nestedPath: string
  renderChild: (
    child: ExtractedField,
    pathPrefix: string,
    parentPerms?: unknown,
    inheritedReadOnly?: boolean,
  ) => React.ReactNode
  disabled?: boolean
  /** v3.7: the FieldPermissions object for this array field itself — its
   *  `.fields` map gates per-row subfields. */
  rowPerms?: unknown
}

export function ArrayInput({
  id,
  field,
  value,
  onChange,
  nestedPath,
  renderChild,
  disabled,
  rowPerms,
}: ArrayInputProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const subfields = field.fields ?? []
  const rows = React.useMemo<Row[]>(() => {
    if (!Array.isArray(value)) return []
    return value.map((r) =>
      r && typeof r === 'object'
        ? ensureRowId(r as Record<string, unknown>)
        : ensureRowId({}),
    )
  }, [value])

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

  const addRow = () => {
    const newRow = seedRowDefaults(subfields)
    markExpanded(newRow.id)
    onChange([...rows, newRow])
  }
  const removeRow = (rowId: string) => {
    onChange(rows.filter((r) => r.id !== rowId))
  }

  return (
    <div id={id} className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No rows.</p>
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
                {rows.map((row, idx) => (
                  <SortableRow
                    key={row.id}
                    row={row}
                    index={idx}
                    collapsed={isCollapsed(row.id)}
                    onToggleCollapse={() => toggle(row.id)}
                    summary={deriveRowPreview(subfields, row)}
                    disabled={disabled}
                    onRemove={() => removeRow(row.id)}
                  >
                    {subfields.map((sub) =>
                      // Cascade the array's `disabled` to its row subfields so
                      // their inputs are disabled too (not just add/remove/
                      // reorder). `disabled` here covers both readOnly fields and
                      // the form-wide submitting state — children should be
                      // non-editable in either case.
                      renderChild(sub, `${nestedPath}.${idx}.`, rowPerms, disabled),
                    )}
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={disabled}
        className="self-start"
      >
        <PlusIcon className="size-3" />
        {t('shadcnAdmin:addRow')}
      </Button>
    </div>
  )
}

function SortableRow({
  row,
  index,
  collapsed,
  onToggleCollapse,
  summary,
  disabled,
  onRemove,
  children,
  header,
}: {
  row: Row
  index: number
  collapsed: boolean
  onToggleCollapse: () => void
  summary?: string
  disabled?: boolean
  onRemove: () => void
  children: React.ReactNode
  header?: React.ReactNode
}): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  }
  return (
    <Card ref={setNodeRef} style={style}>
      {/* When collapsed: center everything vertically (compact row).
          When expanded: stretch so side buttons align to top of tall content. */}
      <CardContent
        className={cn(
          'flex flex-row gap-2 px-2 py-1',
          collapsed ? 'items-center' : 'items-stretch',
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className={cn(
            'flex shrink-0 cursor-grab text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
            collapsed ? 'items-center' : 'items-start pt-2',
          )}
          aria-label={t('shadcnAdmin:dragToReorder')}
        >
          <GripVerticalIcon className="size-4" />
        </button>

        <div className="flex flex-1 flex-col">
          {/* Header: chevron + index + badge (right after #N) + preview summary.
              Badge is inside the toggle button so it sits next to the number
              instead of being pushed to the far right. The gap between this
              button and CollapsibleContent is absent when collapsed (no gap-N on
              the parent flex) — avoiding extra whitespace from a height-0
              CollapsibleContent still occupying a flex slot. */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center gap-2 text-base text-muted-foreground hover:text-foreground"
            aria-label={
              collapsed
                ? t('shadcnAdmin:expandRow')
                : t('shadcnAdmin:collapseRow')
            }
          >
            {collapsed ? (
              <ChevronRightIcon className="size-4 shrink-0" />
            ) : (
              <ChevronDownIcon className="size-4 shrink-0" />
            )}
            <span className="shrink-0 font-medium">#{index + 1}</span>
            {header}
            {collapsed && summary && (
              <span className="truncate text-muted-foreground/60">
                {summary}
              </span>
            )}
          </button>

          {/* Grid-rows transition: animates height via grid-template-rows 0fr↔1fr.
              No keyframes needed; the inner div's min-h-0 lets it collapse fully. */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: collapsed ? '0fr' : '1fr',
              transition: 'grid-template-rows 0.2s ease',
            }}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-3 pt-3">{children}</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className={cn(
            'flex shrink-0 cursor-pointer text-muted-foreground hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50',
            collapsed ? 'items-center' : 'items-start pt-2',
          )}
          aria-label={t('shadcnAdmin:removeRow')}
        >
          <TrashIcon className="size-4" />
        </button>
      </CardContent>
    </Card>
  )
}

export { SortableRow }

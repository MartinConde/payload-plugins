'use client'

/* Client shell for the dashboard: takes server-rendered widget content (each
   widget is an RSC-produced React node — see AutoDashboardView) and makes the
   grid drag-to-reorder, resizable (1/2/full-width columns), and hideable, all
   dnd-kit sensors/handle patterns mirroring GalleryArrayInput. Layout persists
   per-user via useDashboardLayoutPrefs.

   Widgets are passed in as pre-rendered nodes rather than re-rendered here —
   this is the standard "Server Component as children of a Client Component"
   pattern, so widget content keeps doing server-side data fetching (payload.find,
   payload.count) without this file needing to be a server component itself. */

import * as React from 'react'
import { Columns2Icon, EyeOffIcon, GripVerticalIcon, PlusIcon } from 'lucide-react'
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

import { Button } from 'payload-plugin-shadcn-ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import { useTranslation } from '../../internal/payloadAdapterUI.js'
import type { TFunction } from '../../internal/payloadAdapter.js'
import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../translations.js'
import { useDashboardLayoutPrefs } from './prefs/useDashboardLayoutPrefs.js'

export type DashboardWidgetSize = 'sm' | 'md' | 'full'

export type DashboardWidget = {
  id: string
  /** Shown in the "Add widget" menu when hidden, and as the resize/hide
   *  controls' accessible names. */
  label: string
  node: React.ReactNode
}

type Translate = TFunction<ShadcnAdminTranslationsKeys>

const DEFAULT_SIZE: DashboardWidgetSize = 'full'

const SIZE_KEYS: Record<DashboardWidgetSize, ShadcnAdminTranslationsKeys> = {
  sm: 'shadcnAdmin:widgetSizeSmall',
  md: 'shadcnAdmin:widgetSizeMedium',
  full: 'shadcnAdmin:widgetSizeFull',
}

const SIZE_COLSPAN: Record<DashboardWidgetSize, string> = {
  sm: 'col-span-1',
  md: 'col-span-1 sm:col-span-2',
  full: 'col-span-1 sm:col-span-2 lg:col-span-3',
}

export function DashboardGrid({
  widgets,
}: {
  widgets: DashboardWidget[]
}): React.ReactElement | null {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const {
    order: storedOrder,
    hidden,
    sizes,
    loaded,
    setOrder,
    setHidden,
    setSize,
  } = useDashboardLayoutPrefs()

  const defaultOrder = React.useMemo(() => widgets.map((w) => w.id), [widgets])
  const byId = React.useMemo(
    () => new Map(widgets.map((w) => [w.id, w])),
    [widgets],
  )
  const hiddenSet = React.useMemo(() => new Set(hidden), [hidden])

  // Reconcile the persisted order against the current widget set: keep known
  // ids in their saved order, append any new widget ids at the end, drop ids
  // for widgets that no longer exist.
  const order = React.useMemo(() => {
    if (!loaded || !storedOrder) return defaultOrder
    const known = storedOrder.filter((id) => byId.has(id))
    const missing = defaultOrder.filter((id) => !known.includes(id))
    return [...known, ...missing]
  }, [loaded, storedOrder, byId, defaultOrder])

  const visibleOrder = React.useMemo(
    () => order.filter((id) => !hiddenSet.has(id)),
    [order, hiddenSet],
  )
  const hiddenWidgets = React.useMemo(
    () => order.filter((id) => hiddenSet.has(id)).map((id) => byId.get(id)!),
    [order, hiddenSet, byId],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(String(active.id))
    const newIndex = order.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    setOrder(arrayMove(order, oldIndex, newIndex))
  }

  if (widgets.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {hiddenWidgets.length > 0 && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <PlusIcon className="size-4" />
                {t('shadcnAdmin:addWidget')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('shadcnAdmin:hiddenWidgets')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hiddenWidgets.map((widget) => (
                <DropdownMenuItem
                  key={widget.id}
                  onSelect={() => setHidden(hidden.filter((id) => id !== widget.id))}
                >
                  {widget.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {visibleOrder.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visibleOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleOrder.map((id) => {
                const widget = byId.get(id)
                if (!widget) return null
                return (
                  <SortableWidget
                    key={id}
                    id={id}
                    label={widget.label}
                    size={sizes[id] ?? DEFAULT_SIZE}
                    onSizeChange={(size) => setSize(id, size)}
                    onHide={() => setHidden([...hidden, id])}
                    t={t}
                  >
                    {widget.node}
                  </SortableWidget>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortableWidget({
  id,
  label,
  size,
  onSizeChange,
  onHide,
  t,
  children,
}: {
  id: string
  label: string
  size: DashboardWidgetSize
  onSizeChange: (size: DashboardWidgetSize) => void
  onHide: () => void
  t: Translate
  children: React.ReactNode
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group relative', SIZE_COLSPAN[size], isDragging && 'z-10')}
    >
      <div
        className={cn(
          'absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-background/80 p-0.5 shadow-sm backdrop-blur',
          'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label={t('shadcnAdmin:resizeWidget', { label })}
            >
              <Columns2Icon className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('shadcnAdmin:widgetWidth')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={size}
              onValueChange={(value) => onSizeChange(value as DashboardWidgetSize)}
            >
              {(Object.keys(SIZE_KEYS) as DashboardWidgetSize[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {t(SIZE_KEYS[key])}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={onHide}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
          aria-label={t('shadcnAdmin:hideWidget', { label })}
        >
          <EyeOffIcon className="size-4" />
        </button>

        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex size-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label={t('shadcnAdmin:dragToReorder')}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </div>
      {children}
    </div>
  )
}

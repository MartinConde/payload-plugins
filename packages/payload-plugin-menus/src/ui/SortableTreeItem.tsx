'use client'

/* One row of the dnd-kit sortable tree: drag handle, expand toggle, compact
   summary / expanded edit fields, and the right-hand structural controls.
   Split out of MenuTreeEditor.tsx, which owns all tree state and passes this
   component pure props + callbacks. */

import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  IndentDecreaseIcon,
  IndentIncreaseIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'

import { DocPicker } from './DocPicker.js'
import { INDENT, type Tr } from './menuTreeMutations.js'
import type { MenuItem, MenuItemLinkType } from '../menuTree.js'
import type { FlattenedItem } from './treeUtils.js'

type RowProps = {
  item: FlattenedItem
  depth: number
  childCount: number
  expanded: boolean
  canIndent: boolean
  canOutdent: boolean
  canAddChild: boolean
  disabled: boolean
  linkableCollections: string[]
  collectionLabels: Record<string, string>
  useAsTitleBySlug: Record<string, string | undefined>
  activeLocale: string | null
  tr: Tr
  onToggleExpand: () => void
  onChange: (patch: Partial<MenuItem>) => void
  onSelectDoc: (relationTo: string, value: string) => void
  onRemove: () => void
  onDuplicate: () => void
  onAddChild: () => void
  onIndent: () => void
  onOutdent: () => void
}

export function SortableTreeItem({
  item,
  depth,
  childCount,
  expanded,
  canIndent,
  canOutdent,
  canAddChild,
  disabled,
  linkableCollections,
  collectionLabels,
  useAsTitleBySlug,
  activeLocale,
  tr,
  onToggleExpand,
  onChange,
  onSelectDoc,
  onRemove,
  onDuplicate,
  onAddChild,
  onIndent,
  onOutdent,
}: RowProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    marginLeft: depth * INDENT,
  }

  const relationTo =
    item.doc?.relationTo && linkableCollections.includes(item.doc.relationTo)
      ? item.doc.relationTo
      : linkableCollections[0]

  const setType = (type: MenuItemLinkType) =>
    onChange({
      type,
      doc:
        type === 'document'
          ? (item.doc ?? { relationTo: linkableCollections[0], value: '' })
          : null,
      url: type === 'custom' ? (item.url ?? '') : null,
    })

  // Flag items with no usable link target (no document selected / empty URL).
  const isBroken =
    item.type === 'document' ? !item.doc?.value : !(item.url && item.url.trim())

  // One-line summary shown in the collapsed (compact) state.
  const summary =
    item.type === 'custom'
      ? item.url || ''
      : item.doc?.value
        ? (collectionLabels[relationTo] ?? relationTo)
        : tr('pluginMenus:linkDocument', 'Document')

  // Collapsed rows are a single centered line; expanded rows top-align so the
  // left/right icon columns sit beside the first input row.
  const sideMt = expanded ? 'mt-1' : ''

  return (
    <Card ref={setNodeRef} style={style} className="gap-0 py-0">
      <CardContent
        className={`flex flex-row gap-2 px-2 py-1.5 ${
          expanded ? 'items-start' : 'items-center'
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className={`${sideMt} shrink-0 cursor-grab text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label={tr('pluginMenus:dragToReorder', 'Drag to reorder')}
        >
          <GripVerticalIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          className={`${sideMt} shrink-0 text-muted-foreground hover:text-foreground`}
          aria-label={
            expanded
              ? tr('pluginMenus:collapse', 'Collapse')
              : tr('pluginMenus:expand', 'Expand')
          }
        >
          {expanded ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </button>

        {expanded ? (
          <div className="flex flex-1 flex-col gap-2.5">
            {/* Row 1: link type → collection → document (or custom URL) */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={item.type}
                disabled={disabled}
                onValueChange={(v) => setType(v as MenuItemLinkType)}
              >
                <SelectTrigger className="h-8 w-[8.5rem] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">
                    {tr('pluginMenus:linkDocument', 'Document')}
                  </SelectItem>
                  <SelectItem value="custom">
                    {tr('pluginMenus:linkCustom', 'Custom URL')}
                  </SelectItem>
                </SelectContent>
              </Select>

              {item.type === 'document' ? (
                <>
                  {linkableCollections.length > 1 ? (
                    <Select
                      value={relationTo}
                      disabled={disabled}
                      onValueChange={(slug) => onSelectDoc(slug, '')}
                    >
                      <SelectTrigger className="h-8 w-[10rem] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {linkableCollections.map((slug) => (
                          <SelectItem key={slug} value={slug}>
                            {collectionLabels[slug] ?? slug}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <div className="min-w-[12rem] flex-1">
                    <DocPicker
                      relatedSlug={relationTo}
                      useAsTitle={useAsTitleBySlug?.[relationTo]}
                      value={item.doc?.value || null}
                      onChange={(v) => onSelectDoc(relationTo, v ?? '')}
                      activeLocale={activeLocale}
                      disabled={disabled}
                      placeholder={tr('pluginMenus:docSelectPlaceholder', 'Select a document…')}
                      searchPlaceholder={tr('pluginMenus:docSearchPlaceholder', 'Search documents…')}
                      emptyLabel={tr('pluginMenus:docNoResults', 'No documents found')}
                      clearLabel={tr('pluginMenus:docClear', 'Clear selection')}
                    />
                  </div>
                  {item.doc?.value ? (
                    <a
                      href={`/admin/collections/${relationTo}/${item.doc.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={tr('pluginMenus:openDocument', 'Open linked document')}
                      aria-label={tr('pluginMenus:openDocument', 'Open linked document')}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ExternalLinkIcon className="size-4" />
                    </a>
                  ) : null}
                </>
              ) : (
                <Input
                  value={item.url ?? ''}
                  disabled={disabled}
                  placeholder={tr('pluginMenus:customUrlPlaceholder', 'https://… or /path')}
                  onChange={(e) => onChange({ url: e.target.value })}
                  className="h-8 min-w-[12rem] flex-1"
                />
              )}
            </div>

            {/* Row 2: label + new tab + custom class (structural controls live
                in the right-hand icon column). */}
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={item.label}
                disabled={disabled}
                placeholder={tr('pluginMenus:labelPlaceholder', 'Menu label')}
                onChange={(e) => onChange({ label: e.target.value })}
                className="h-8 min-w-[12rem] flex-1"
              />
              <label className="inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={item.newTab === true}
                  disabled={disabled}
                  onChange={(e) => onChange({ newTab: e.target.checked })}
                  className="size-3.5 accent-primary"
                />
                <ExternalLinkIcon className="size-3" />
                {tr('pluginMenus:openNewTab', 'Open in new tab')}
              </label>
              <Input
                value={item.className ?? ''}
                disabled={disabled}
                placeholder={tr('pluginMenus:cssClassPlaceholder', 'e.g. is-highlighted')}
                onChange={(e) => onChange({ className: e.target.value })}
                className="h-8 w-[12rem] shrink-0"
                aria-label={tr('pluginMenus:cssClassLabel', 'CSS class')}
              />
              {isBroken ? (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <TriangleAlertIcon className="size-3.5" />
                  {tr('pluginMenus:brokenLink', 'No link target set')}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          /* Compact (collapsed): label + minimal info; click to expand. */
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex min-h-[1.75rem] flex-1 items-center gap-2 overflow-hidden text-left"
          >
            {isBroken ? (
              <TriangleAlertIcon
                className="size-3.5 shrink-0 text-amber-500"
                aria-label={tr('pluginMenus:brokenLink', 'No link target set')}
              />
            ) : null}
            <span
              className={`truncate text-sm font-medium ${
                item.label ? '' : 'italic text-muted-foreground'
              }`}
            >
              {item.label || tr('pluginMenus:untitled', 'Untitled item')}
            </span>
            {childCount > 0 ? (
              <Badge variant="secondary" className="shrink-0">
                {childCount}
              </Badge>
            ) : null}
            {summary ? (
              <span className="ml-auto max-w-[45%] truncate text-xs text-muted-foreground">
                {summary}
              </span>
            ) : null}
            {item.newTab ? (
              <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
            ) : null}
          </button>
        )}

        {/* Right-hand icon column: delete on top, then the structural controls
            stacked beneath it (only when expanded). */}
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <IconButton
            disabled={disabled}
            onClick={onRemove}
            destructive
            label={tr('pluginMenus:removeItem', 'Remove item')}
          >
            <Trash2Icon className="size-4" />
          </IconButton>
          {expanded ? (
            <>
              <IconButton
                disabled={disabled}
                onClick={onDuplicate}
                label={tr('pluginMenus:duplicateItem', 'Duplicate item')}
              >
                <CopyIcon className="size-4" />
              </IconButton>
              <IconButton
                disabled={disabled || !canOutdent}
                onClick={onOutdent}
                label={tr('pluginMenus:outdent', 'Move out one level')}
              >
                <IndentDecreaseIcon className="size-4" />
              </IconButton>
              <IconButton
                disabled={disabled || !canIndent}
                onClick={onIndent}
                label={tr('pluginMenus:indent', 'Nest under previous item')}
              >
                <IndentIncreaseIcon className="size-4" />
              </IconButton>
              <IconButton
                disabled={disabled || !canAddChild}
                onClick={onAddChild}
                label={tr('pluginMenus:addChild', 'Add sub-item')}
              >
                <PlusIcon className="size-4" />
              </IconButton>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function IconButton({
  disabled,
  onClick,
  label,
  destructive,
  children,
}: {
  disabled?: boolean
  onClick: () => void
  label: string
  destructive?: boolean
  children: React.ReactNode
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

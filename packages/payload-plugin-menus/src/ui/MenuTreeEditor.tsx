'use client'

/* The heavy menu-tree editor, lazy-loaded by MenuTreeInput so its CSS-pulling
   imports never reach the Payload CLI's Node config load. Runs only in the
   browser, so it freely uses shadcn primitives, dnd-kit, and shadcn-admin's
   RelationshipPicker.

   Data contract: the bridge hands `value` = the active locale's stored tree
   (a localized `json` leaf is pre-sliced — see shadcn-admin's
   FieldTreeRenderer). Mutations call `onChange(stripResolved(nextTree))`, which
   the bridge merges back into the locale-keyed object for the active locale.

   The nested tree is edited via the canonical dnd-kit "sortable tree" pattern:
   flatten → one SortableContext → horizontal-drag depth projection → rebuild. */

import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  IndentDecreaseIcon,
  IndentIncreaseIcon,
  LanguagesIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useConfig, useTranslation } from '@payloadcms/ui'
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
  useDocIdentity,
  type FieldInputProps,
} from 'payload-plugin-shadcn-ui'

import { DocPicker } from './DocPicker.js'

import {
  newMenuItem,
  normalizeMenuTree,
  stripResolved,
  type MenuItem,
  type MenuItemLinkType,
  type MenuTree,
} from '../menuTree.js'
import {
  buildTree,
  flattenTree,
  getProjection,
  removeChildrenOf,
  type FlattenedItem,
} from './treeUtils.js'
import type {
  MenusTranslationsKeys,
  MenusTranslationsObject,
} from '../translations.js'

const INDENT = 28

type Tr = (key: MenusTranslationsKeys, fallback: string) => string

// ---------------------------------------------------------------------------
// Pure tree mutations (operate on the nested tree; return a new tree).
// ---------------------------------------------------------------------------

const patchItem = (tree: MenuTree, id: string, patch: Partial<MenuItem>): MenuTree =>
  tree.map((item) =>
    item.id === id
      ? { ...item, ...patch, children: patchItem(item.children, id, patch) }
      : { ...item, children: patchItem(item.children, id, patch) },
  )

const removeItem = (tree: MenuTree, id: string): MenuTree =>
  tree
    .filter((item) => item.id !== id)
    .map((item) => ({ ...item, children: removeItem(item.children, id) }))

const addChild = (tree: MenuTree, parentId: string, child: MenuItem): MenuTree =>
  tree.map((item) =>
    item.id === parentId
      ? { ...item, children: [...item.children, child] }
      : { ...item, children: addChild(item.children, parentId, child) },
  )

const freshId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `item-${Math.random().toString(36).slice(2, 10)}`

/** Deep-clone an item subtree with fresh ids (so a duplicate is independent). */
const cloneItem = (item: MenuItem): MenuItem => ({
  ...item,
  id: freshId(),
  children: item.children.map(cloneItem),
})

/** Insert `node` immediately after the item with `id` (same parent/level). */
const insertAfter = (tree: MenuTree, id: string, node: MenuItem): MenuTree => {
  const out: MenuTree = []
  for (const item of tree) {
    out.push({ ...item, children: insertAfter(item.children, id, node) })
    if (item.id === id) out.push(node)
  }
  return out
}

/** Find an item anywhere in the tree by id. */
const findItem = (tree: MenuTree, id: string): MenuItem | null => {
  for (const item of tree) {
    if (item.id === id) return item
    const hit = findItem(item.children, id)
    if (hit) return hit
  }
  return null
}

/** Fetch a linked doc's title (for auto-filling an item's label). Tries the
 *  collection's useAsTitle field, then the usual title fields. Returns null on
 *  any failure — auto-fill is best-effort. */
const fetchDocTitle = async (
  slug: string,
  id: string,
  useAsTitle: string | undefined,
  locale: string | null | undefined,
): Promise<string | null> => {
  try {
    const params = new URLSearchParams({ depth: '0', draft: 'true' })
    if (locale) params.set('locale', locale)
    const res = await fetch(`/api/${slug}/${id}?${params.toString()}`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    const doc = (await res.json()) as Record<string, unknown>
    for (const key of [useAsTitle, 'title', 'name', 'label']) {
      if (key && typeof doc[key] === 'string' && doc[key]) return doc[key] as string
    }
  } catch {
    /* best-effort */
  }
  return null
}

/** Re-derive the label of every document-linked item from its linked doc's
 *  title IN `locale` (custom-URL items keep their label). Used by the sync
 *  "labels from linked documents" mode so copying en→fr gives French page
 *  titles. Keeps the existing label when a doc has no title in `locale` yet
 *  (so untranslated pages don't blank the label). Fetches are deduped. */
const relabelFromDocs = async (
  tree: MenuTree,
  locale: string | null,
  useAsTitleBySlug: Record<string, string | undefined>,
): Promise<MenuTree> => {
  const refs = new Map<string, { relationTo: string; id: string }>()
  const collect = (items: MenuTree) => {
    for (const item of items) {
      if (item.type === 'document' && item.doc?.value) {
        refs.set(`${item.doc.relationTo}:${item.doc.value}`, {
          relationTo: item.doc.relationTo,
          id: item.doc.value,
        })
      }
      collect(item.children)
    }
  }
  collect(tree)

  const titles = new Map<string, string | null>()
  await Promise.all(
    [...refs.entries()].map(async ([key, { relationTo, id }]) => {
      titles.set(key, await fetchDocTitle(relationTo, id, useAsTitleBySlug?.[relationTo], locale))
    }),
  )

  const walk = (items: MenuTree): MenuTree =>
    items.map((item) => {
      let label = item.label
      if (item.type === 'document' && item.doc?.value) {
        const title = titles.get(`${item.doc.relationTo}:${item.doc.value}`)
        if (title) label = title
      }
      return { ...item, label, children: walk(item.children) }
    })
  return walk(tree)
}

/** Collect every item's id → label, recursively (for label-preserving sync). */
const labelMap = (tree: MenuTree, out: Map<string, string> = new Map()) => {
  for (const item of tree) {
    out.set(item.id, item.label)
    labelMap(item.children, out)
  }
  return out
}

/** Copy `source`, keeping each item's label from `keep` where the id matches
 *  (falls back to the source label for ids not present in `keep`). */
const mergeKeepingLabels = (source: MenuTree, keep: MenuTree): MenuTree => {
  const labels = labelMap(keep)
  const walk = (items: MenuTree): MenuTree =>
    items.map((item) => ({
      ...item,
      label: labels.has(item.id) ? labels.get(item.id)! : item.label,
      children: walk(item.children),
    }))
  return walk(source)
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export function MenuTreeEditor(props: FieldInputProps): React.ReactElement {
  const { value, onChange, field, activeLocale, disabled, useAsTitleBySlug } = props
  const { t } = useTranslation<MenusTranslationsObject, MenusTranslationsKeys>()
  const tr: Tr = React.useCallback(
    (key, fallback) => {
      const out = t(key)
      // useTranslation returns the key itself when unresolved — fall back then.
      return out && out !== key ? out : fallback
    },
    [t],
  )

  // Both stashed inside the shadcn-admin namespace because extractCollection
  // only carries `custom['plugin-shadcn-admin']` across the RSC→client boundary.
  const pluginCustom = field.custom?.['plugin-shadcn-admin'] as
    | { linkableCollections?: unknown; maxDepth?: unknown }
    | undefined
  const linkableCollections = React.useMemo<string[]>(() => {
    const raw = pluginCustom?.linkableCollections
    return Array.isArray(raw) && raw.length > 0 ? raw.map(String) : ['pages']
  }, [pluginCustom])
  const maxDepth =
    typeof pluginCustom?.maxDepth === 'number' && pluginCustom.maxDepth > 0
      ? pluginCustom.maxDepth
      : undefined

  // slug → display label, for the collection picker (shows "Pages" not "pages").
  const { config } = useConfig()
  const collectionLabels = React.useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    const cols = (config as { collections?: Array<Record<string, unknown>> } | undefined)
      ?.collections
    for (const c of cols ?? []) {
      const slug = String(c.slug)
      const labels = c.labels as { singular?: unknown } | undefined
      const singular = labels?.singular
      out[slug] =
        typeof singular === 'string'
          ? singular
          : singular && typeof singular === 'object'
            ? String(
                (singular as Record<string, unknown>)[activeLocale ?? 'en'] ??
                  Object.values(singular as Record<string, unknown>)[0] ??
                  slug,
              )
            : slug
    }
    return out
  }, [config, activeLocale])

  const tree = React.useMemo<MenuTree>(() => normalizeMenuTree(value), [value])
  // Latest tree, for async callbacks (auto-label fetch) that resolve after a
  // re-render and must read/patch the current tree, not a stale closure.
  const treeRef = React.useRef(tree)
  React.useEffect(() => {
    treeRef.current = tree
  }, [tree])
  const commit = React.useCallback(
    (next: MenuTree) => onChange(stripResolved(next)),
    [onChange],
  )

  // Editor-local expand state (not persisted). Rows are COMPACT by default
  // (label + minimal info); only expanded rows show the edit fields and their
  // children. Newly added items are auto-expanded so they're immediately
  // editable.
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const expand = (...ids: string[]) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
  const expandAll = () =>
    setExpanded(new Set(flattenTree(tree).map((i) => i.id)))
  const collapseAll = () => setExpanded(new Set())

  // dnd ephemeral state
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = React.useState<UniqueIdentifier | null>(null)
  const [offsetLeft, setOffsetLeft] = React.useState(0)

  const flattened = React.useMemo<FlattenedItem[]>(() => {
    const flat = flattenTree(tree)
    // A row hides its children unless it's expanded; the dragged subtree is
    // always hidden during a drag.
    const exclude: UniqueIdentifier[] = flat
      .filter((i) => !expanded.has(i.id))
      .map((i) => i.id)
    if (activeId != null) exclude.push(activeId)
    return removeChildrenOf(flat, exclude)
  }, [tree, expanded, activeId])

  const projected =
    activeId != null && overId != null
      ? getProjection(flattened, activeId, overId, offsetLeft, INDENT, maxDepth)
      : null

  const sortedIds = React.useMemo(() => flattened.map((i) => i.id), [flattened])
  const activeItem =
    activeId != null ? flattened.find((i) => i.id === String(activeId)) : null

  // Ids that have a preceding sibling (→ can be indented), computed once over
  // the FULL flatten so the answer holds even when the prev sibling is collapsed.
  const indentableIds = React.useMemo(() => {
    const flat = flattenTree(tree)
    const ids = new Set<string>()
    flat.forEach((_, i) => {
      if (prevSiblingOf(flat, i)) ids.add(flat[i].id)
    })
    return ids
  }, [tree])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const resetDrag = () => {
    setActiveId(null)
    setOverId(null)
    setOffsetLeft(0)
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id)
    setOverId(active.id)
  }
  const handleDragMove = ({ delta }: DragMoveEvent) => setOffsetLeft(delta.x)
  const handleDragOver = ({ over }: DragOverEvent) => setOverId(over?.id ?? null)
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    resetDrag()
    if (!projected || !over) return
    const { depth, parentId } = projected
    const clone = flattenTree(tree)
    const activeIndex = clone.findIndex((i) => i.id === String(active.id))
    const overIndex = clone.findIndex((i) => i.id === String(over.id))
    if (activeIndex < 0 || overIndex < 0) return
    clone[activeIndex] = { ...clone[activeIndex], depth, parentId }
    commit(buildTree(arrayMove(clone, activeIndex, overIndex)))
  }

  // Per-item mutation handlers.
  const onItemChange = (id: string, patch: Partial<MenuItem>) =>
    commit(patchItem(tree, id, patch))
  const onItemRemove = (id: string) => commit(removeItem(tree, id))
  const onItemDuplicate = (id: string) => {
    const original = findItem(tree, id)
    if (!original) return
    commit(insertAfter(tree, id, cloneItem(original)))
  }
  const onItemAddChild = (id: string) => {
    const child = newMenuItem()
    expand(id, child.id) // reveal the parent's subtree + edit the new child
    commit(addChild(tree, id, child))
  }
  const onItemAddRoot = () => {
    const item = newMenuItem()
    expand(item.id)
    commit([...tree, item])
  }
  const onIndent = (id: string) => reparentRelative(id, 'indent')
  const onOutdent = (id: string) => reparentRelative(id, 'outdent')

  // Selecting a document also auto-fills the label with the doc's title when the
  // label is still empty (never overwrites a label the editor typed). The title
  // fetch is async, so it re-checks the LATEST tree (treeRef) before patching.
  const onSelectDoc = (id: string, relationTo: string, value: string) => {
    commit(patchItem(tree, id, { doc: { relationTo, value } }))
    if (!value) return
    const current = findItem(tree, id)
    if (current && current.label.trim()) return
    void fetchDocTitle(relationTo, value, useAsTitleBySlug?.[relationTo], activeLocale).then(
      (title) => {
        if (!title) return
        const live = findItem(treeRef.current, id)
        if (!live || live.label.trim()) return
        commit(patchItem(treeRef.current, id, { label: title }))
      },
    )
  }

  // indent = become a child of the preceding sibling; outdent = become a
  // sibling of the current parent. Implemented over the full flatten so the
  // moved item keeps its own subtree (children rows keep parentId = item.id).
  const reparentRelative = (id: string, dir: 'indent' | 'outdent') => {
    const flat = flattenTree(tree)
    const idx = flat.findIndex((i) => i.id === id)
    if (idx < 0) return
    const item = flat[idx]
    if (dir === 'indent') {
      const prevSibling = prevSiblingOf(flat, idx)
      if (!prevSibling) return
      flat[idx] = { ...item, parentId: prevSibling.id }
    } else {
      if (item.parentId == null) return
      const parent = flat.find((i) => i.id === item.parentId)
      flat[idx] = { ...item, parentId: parent ? parent.parentId : null }
    }
    commit(buildTree(flat))
  }

  return (
    <div className="flex flex-col gap-3">
      {activeLocale ? (
        <LocaleSync
          activeLocale={activeLocale}
          tree={tree}
          disabled={disabled}
          useAsTitleBySlug={useAsTitleBySlug}
          tr={tr}
          onApply={commit}
        />
      ) : null}

      {flattened.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          {tr('pluginMenus:noItems', 'No items yet. Add your first menu item.')}
        </p>
      ) : (
        <>
        {flattenTree(tree).some((i) => i.children.length > 0) ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={expandAll}
              className="hover:text-foreground hover:underline"
            >
              {tr('pluginMenus:expandAll', 'Expand all')}
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="hover:text-foreground hover:underline"
            >
              {tr('pluginMenus:collapseAll', 'Collapse all')}
            </button>
          </div>
        ) : null}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={resetDrag}
        >
          <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {flattened.map((item, i) => (
                <SortableTreeItem
                  key={item.id}
                  item={item}
                  depth={
                    item.id === String(activeId) && projected
                      ? projected.depth
                      : item.depth
                  }
                  childCount={item.children.length}
                  expanded={expanded.has(item.id)}
                  canIndent={
                    indentableIds.has(item.id) &&
                    (maxDepth == null || item.depth + 1 <= maxDepth - 1)
                  }
                  canOutdent={item.parentId != null}
                  canAddChild={maxDepth == null || item.depth + 1 <= maxDepth - 1}
                  disabled={Boolean(disabled)}
                  linkableCollections={linkableCollections}
                  collectionLabels={collectionLabels}
                  useAsTitleBySlug={useAsTitleBySlug}
                  activeLocale={activeLocale ?? null}
                  tr={tr}
                  onToggleExpand={() => toggleExpand(item.id)}
                  onChange={(patch) => onItemChange(item.id, patch)}
                  onSelectDoc={(relationTo, value) =>
                    onSelectDoc(item.id, relationTo, value)
                  }
                  onRemove={() => onItemRemove(item.id)}
                  onDuplicate={() => onItemDuplicate(item.id)}
                  onAddChild={() => onItemAddChild(item.id)}
                  onIndent={() => onIndent(item.id)}
                  onOutdent={() => onOutdent(item.id)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <div className="rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-lg">
                {activeItem.label ||
                  tr('pluginMenus:untitled', 'Untitled item')}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        </>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onItemAddRoot}
        className="self-start"
      >
        <PlusIcon className="size-3" />
        {tr('pluginMenus:addItem', 'Add item')}
      </Button>
    </div>
  )
}

/** Nearest earlier row that is a sibling of `flat[idx]` (same parent, same
 *  depth, with only descendants of earlier siblings in between). */
const prevSiblingOf = (
  flat: FlattenedItem[],
  idx: number,
): FlattenedItem | null => {
  if (idx < 0) return null
  const self = flat[idx]
  for (let i = idx - 1; i >= 0; i--) {
    if (flat[i].depth < self.depth) return null // hit the parent → no prev sibling
    if (flat[i].depth === self.depth && flat[i].parentId === self.parentId) {
      return flat[i]
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

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

function SortableTreeItem({
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

// ---------------------------------------------------------------------------
// Locale sync
// ---------------------------------------------------------------------------

function LocaleSync({
  activeLocale,
  tree,
  disabled,
  useAsTitleBySlug,
  tr,
  onApply,
}: {
  activeLocale: string
  tree: MenuTree
  disabled?: boolean
  useAsTitleBySlug: Record<string, string | undefined>
  tr: Tr
  onApply: (next: MenuTree) => void
}): React.ReactElement | null {
  const { config } = useConfig()
  const { collectionSlug, documentId } = useDocIdentity()

  const locales = React.useMemo<{ code: string; label: string }[]>(() => {
    const loc = (config as { localization?: unknown } | undefined)?.localization
    if (!loc || typeof loc !== 'object') return []
    const list = (loc as { locales?: Array<{ code: string; label?: unknown }> })
      .locales
    if (!Array.isArray(list)) return []
    return list.map((l) => ({
      code: l.code,
      label: typeof l.label === 'string' ? l.label : l.code,
    }))
  }, [config])

  const sources = locales.filter((l) => l.code !== activeLocale)

  const [source, setSource] = React.useState('')
  // 'relabel' (default): re-derive document labels from the linked doc's title
  // in the current language. 'labels': copy source labels as-is. 'structure':
  // keep current labels where item ids match.
  const [mode, setMode] = React.useState<'relabel' | 'labels' | 'structure'>(
    'relabel',
  )
  const [status, setStatus] = React.useState<
    'idle' | 'loading' | 'error' | 'empty' | 'done'
  >('idle')

  if (sources.length === 0) return null

  const canSync =
    !disabled && documentId != null && collectionSlug != null && source !== ''

  const apply = async () => {
    if (!canSync) return
    setStatus('loading')
    try {
      const res = await fetch(
        `/api/${collectionSlug}/${documentId}?locale=${source}&depth=0&draft=true`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { tree?: unknown }
      const sourceTree = normalizeMenuTree(body.tree)
      // Never silently wipe the current language: the source read is of SAVED
      // data, so an unsaved/empty source would otherwise blow away the current
      // tree. Bail with a clear hint instead.
      if (sourceTree.length === 0) {
        setStatus('empty')
        return
      }
      // Replacing existing items is destructive — confirm first.
      if (
        tree.length > 0 &&
        !window.confirm(
          tr(
            'pluginMenus:syncConfirmOverwrite',
            'Replace the current language’s items with the copied structure?',
          ),
        )
      ) {
        setStatus('idle')
        return
      }
      const next =
        mode === 'labels'
          ? sourceTree
          : mode === 'structure'
            ? mergeKeepingLabels(sourceTree, tree)
            : await relabelFromDocs(sourceTree, activeLocale, useAsTitleBySlug)
      onApply(next)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <LanguagesIcon className="size-3.5" />
        {tr('pluginMenus:syncTitle', 'Sync from another language')}
      </div>
      <p className="text-xs text-muted-foreground">
        {tr(
          'pluginMenus:syncHint',
          'Copies the saved structure of another language — save your changes first.',
        )}
      </p>
      {documentId == null ? (
        <p className="text-xs text-muted-foreground">
          {tr(
            'pluginMenus:syncSaveFirst',
            'Save the menu once before syncing languages.',
          )}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={source} onValueChange={setSource} disabled={disabled}>
            <SelectTrigger className="h-8 w-[12rem]">
              <SelectValue
                placeholder={tr('pluginMenus:syncSourceLabel', 'Source language')}
              />
            </SelectTrigger>
            <SelectContent>
              {sources.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as 'relabel' | 'labels' | 'structure')}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[22rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relabel">
                {tr(
                  'pluginMenus:syncCopyRelabel',
                  'Labels from linked documents (this language)',
                )}
              </SelectItem>
              <SelectItem value="labels">
                {tr('pluginMenus:syncCopyWithLabels', 'Structure and labels (copy as-is)')}
              </SelectItem>
              <SelectItem value="structure">
                {tr(
                  'pluginMenus:syncCopyStructureOnly',
                  'Structure only (keep current labels)',
                )}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            disabled={!canSync || status === 'loading'}
            onClick={apply}
          >
            {status === 'loading'
              ? tr('pluginMenus:syncLoading', 'Loading…')
              : tr('pluginMenus:syncApply', 'Copy into current language')}
          </Button>
          {status === 'error' ? (
            <span className="text-xs text-destructive">
              {tr('pluginMenus:syncError', 'Could not load that language. Please try again.')}
            </span>
          ) : null}
          {status === 'empty' ? (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {tr(
                'pluginMenus:syncEmptySource',
                'The source language has no saved items. Save your changes first, then sync.',
              )}
            </span>
          ) : null}
          {status === 'done' ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {tr('pluginMenus:syncDone', 'Copied')}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}

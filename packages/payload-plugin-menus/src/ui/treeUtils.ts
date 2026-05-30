/* Pure helpers for the flattened-tree dnd-kit pattern (the canonical "sortable
   tree" approach): the nested `MenuTree` is flattened to a single ordered list
   with per-row `depth`/`parentId` so one `SortableContext` can drive both
   reordering AND cross-level nesting via horizontal drag projection. No React,
   no UI deps — kept separate so the logic is testable and the editor file stays
   focused on rendering. */

import type { UniqueIdentifier } from '@dnd-kit/core'
import type { MenuItem, MenuTree } from '../menuTree.js'

export type FlattenedItem = MenuItem & {
  parentId: string | null
  depth: number
  index: number
}

/** Depth-first flatten, preserving order and recording parent + depth. */
export const flattenTree = (
  items: MenuTree,
  parentId: string | null = null,
  depth = 0,
): FlattenedItem[] =>
  items.reduce<FlattenedItem[]>((acc, item, index) => {
    acc.push({ ...item, parentId, depth, index })
    acc.push(...flattenTree(item.children, item.id, depth + 1))
    return acc
  }, [])

/** Rebuild a nested `MenuTree` from a flattened list. Children arrays are reset
 *  and repopulated from each row's (possibly updated) `parentId`. */
export const buildTree = (flattened: FlattenedItem[]): MenuTree => {
  const root: MenuItem = { id: 'root', children: [] } as unknown as MenuItem
  const nodes: Record<string, MenuItem> = { root }
  // Strip the flatten-only bookkeeping; keep a fresh empty children array.
  const items = flattened.map((f) => {
    const { parentId: _p, depth: _d, index: _i, ...item } = f
    return { ...item, children: [] as MenuItem[] }
  })
  for (const item of items) nodes[item.id] = item
  for (const f of flattened) {
    const parent = nodes[f.parentId ?? 'root'] ?? root
    parent.children.push(nodes[f.id])
  }
  return root.children
}

/** Remove the descendants of any id in `ids` from a flattened list (used to
 *  hide a dragged subtree and the children of collapsed rows). */
export const removeChildrenOf = (
  items: FlattenedItem[],
  ids: UniqueIdentifier[],
): FlattenedItem[] => {
  const excluded = new Set(ids.map(String))
  return items.filter((item) => {
    if (item.parentId && excluded.has(item.parentId)) {
      if (item.children.length) excluded.add(item.id)
      return false
    }
    return true
  })
}

const getMaxDepth = (prev: FlattenedItem | undefined): number =>
  prev ? prev.depth + 1 : 0
const getMinDepth = (next: FlattenedItem | undefined): number =>
  next ? next.depth : 0

/** Compute the projected depth + parent for the active drag, given the
 *  horizontal offset. Mirrors the dnd-kit sortable-tree example. */
export const getProjection = (
  items: FlattenedItem[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  dragOffset: number,
  indentationWidth: number,
  /** Max nesting LEVELS (1 = flat). Caps the projected depth at `levelCap - 1`.
   *  Undefined = unlimited. */
  levelCap?: number,
): { depth: number; maxDepth: number; minDepth: number; parentId: string | null } => {
  const overItemIndex = items.findIndex((i) => i.id === String(overId))
  const activeItemIndex = items.findIndex((i) => i.id === String(activeId))
  const activeItem = items[activeItemIndex]
  const newItems = arrayMoveLite(items, activeItemIndex, overItemIndex)
  const prev = newItems[overItemIndex - 1]
  const next = newItems[overItemIndex + 1]
  const dragDepth = Math.round(dragOffset / indentationWidth)
  const projectedDepth = (activeItem?.depth ?? 0) + dragDepth
  const structuralMax = getMaxDepth(prev)
  const maxDepth =
    levelCap && levelCap > 0
      ? Math.min(structuralMax, levelCap - 1)
      : structuralMax
  const minDepth = getMinDepth(next)
  let depth = projectedDepth
  if (projectedDepth >= maxDepth) depth = maxDepth
  else if (projectedDepth < minDepth) depth = minDepth

  const getParentId = (): string | null => {
    if (depth === 0 || !prev) return null
    if (depth === prev.depth) return prev.parentId
    if (depth > prev.depth) return prev.id
    const newParent = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find((i) => i.depth === depth)?.parentId
    return newParent ?? null
  }

  return { depth, maxDepth, minDepth, parentId: getParentId() }
}

/** arrayMove without pulling in @dnd-kit/sortable here (avoids a circular feel
 *  in this pure module). */
const arrayMoveLite = <T,>(arr: T[], from: number, to: number): T[] => {
  const copy = arr.slice()
  const [moved] = copy.splice(from, 1)
  copy.splice(to, 0, moved)
  return copy
}

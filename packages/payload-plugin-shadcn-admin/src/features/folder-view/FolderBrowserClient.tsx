'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  CheckSquare,
  ChevronRight,
  File as FileIcon,
  Folder,
  FolderPlus,
  Home,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast, useLocale, useTranslation } from '../../internal/payloadAdapter.js'

import { Button } from 'payload-plugin-shadcn-ui'
import { Card } from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import { Label } from 'payload-plugin-shadcn-ui'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'payload-plugin-shadcn-ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'

export type FolderItem = {
  itemKey: string
  relationTo: string
  value: {
    id: number | string
    _folderOrDocumentTitle: string
    filename?: string
    url?: string
  }
}

export type FolderBreadcrumb = { id: number | string; name: string }

export type FolderBrowserClientProps = {
  /** Route folder navigation pushes to, e.g. `/admin/browse-by-folder` or
   *  `/admin/collections/media`. */
  basePath: string
  /** Admin route prefix for building document edit links, e.g. `/admin`. */
  adminRoute: string
  /** Slug of the folders collection (`payload-folders`). */
  foldersSlug: string
  /** Name of the folder relationship field (config.folders.fieldName). */
  folderFieldName: string
  currentFolderID: number | string | null
  breadcrumbs: FolderBreadcrumb[]
  subfolders: FolderItem[]
  documents: FolderItem[]
  /** Extra query params preserved on folder navigation (e.g. `{ view: 'folders' }`
   *  for the per-collection view). */
  extraQuery?: Record<string, string>
  rootLabel?: string
}

const DROP_ROOT = 'crumb:__root__'

export function FolderBrowserClient({
  basePath,
  adminRoute,
  foldersSlug,
  folderFieldName,
  currentFolderID,
  breadcrumbs,
  subfolders,
  documents,
  extraQuery,
  rootLabel = 'Folders',
}: FolderBrowserClientProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const locale = useLocale()
  const localeCode =
    locale && typeof locale === 'object' && 'code' in locale
      ? (locale as { code?: string }).code
      : undefined
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const [busy, setBusy] = React.useState(false)
  const [newOpen, setNewOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [renameTarget, setRenameTarget] = React.useState<FolderItem | null>(null)
  const [renameName, setRenameName] = React.useState('')
  const [activeItem, setActiveItem] = React.useState<FolderItem | null>(null)
  const openItemRef = React.useRef<(item: FolderItem) => void>(() => {})
  const [selectMode, setSelectMode] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [anchorKey, setAnchorKey] = React.useState<string | null>(null)

  const clearSelection = React.useCallback(() => {
    setSelected(new Set())
    setAnchorKey(null)
  }, [])

  const itemByKey = React.useMemo(() => {
    const map = new Map<string, FolderItem>()
    for (const it of [...subfolders, ...documents]) map.set(it.itemKey, it)
    return map
  }, [subfolders, documents])

  // Rendered order — used for shift-click range selection.
  const orderedKeys = React.useMemo(
    () => [...subfolders, ...documents].map((it) => it.itemKey),
    [subfolders, documents],
  )

  // Click handler for item cards. In select mode, click toggles selection and
  // shift-click selects the range from the anchor; otherwise it opens the item.
  const handleActivate = React.useCallback(
    (item: FolderItem, opts: { shiftKey: boolean }) => {
      if (!selectMode) {
        openItemRef.current(item)
        return
      }
      if (opts.shiftKey && anchorKey) {
        const a = orderedKeys.indexOf(anchorKey)
        const b = orderedKeys.indexOf(item.itemKey)
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a]
          setSelected((prev) => {
            const next = new Set(prev)
            for (let i = lo; i <= hi; i++) next.add(orderedKeys[i])
            return next
          })
        }
        return
      }
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(item.itemKey)) next.delete(item.itemKey)
        else next.add(item.itemKey)
        return next
      })
      setAnchorKey(item.itemKey)
    },
    [selectMode, anchorKey, orderedKeys],
  )

  const toggleSelectMode = React.useCallback(() => {
    setSelectMode((on) => {
      if (on) clearSelection() // leaving select mode clears the selection
      return !on
    })
  }, [clearSelection])

  // Drop stale selections when the folder contents change (navigation, refresh).
  React.useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev
      const next = new Set<string>()
      for (const k of prev) if (itemByKey.has(k)) next.add(k)
      return next.size === prev.size ? prev : next
    })
  }, [itemByKey])

  const hrefFor = React.useCallback(
    (folderID: number | string | null): string => {
      const params = new URLSearchParams(extraQuery)
      if (folderID != null) params.set('folderID', String(folderID))
      const qs = params.toString()
      return qs ? `${basePath}?${qs}` : basePath
    },
    [basePath, extraQuery],
  )

  const navTo = React.useCallback(
    (folderID: number | string | null) => router.push(hrefFor(folderID)),
    [router, hrefFor],
  )

  const openItem = React.useCallback(
    (item: FolderItem) => {
      if (item.relationTo === foldersSlug) {
        navTo(item.value.id)
        return
      }
      router.push(`${adminRoute}/collections/${item.relationTo}/${item.value.id}`)
    },
    [adminRoute, foldersSlug, navTo, router],
  )
  // Latest-value ref so handleActivate (defined earlier) can open without a
  // dependency cycle.
  openItemRef.current = openItem

  /* ---- mutations (mirror Payload's FoldersProvider request shapes) ---- */

  const createFolder = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    try {
      const res = await fetch(`/api/${foldersSlug}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          [folderFieldName]: currentFolderID ?? null,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setNewOpen(false)
      setNewName('')
      router.refresh()
    } catch {
      toast.error(t('error:unknown'))
    } finally {
      setBusy(false)
    }
  }

  const renameFolder = async () => {
    const name = renameName.trim()
    if (!renameTarget || !name) return
    setBusy(true)
    try {
      const res = await fetch(
        `/api/${foldersSlug}/${renameTarget.value.id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
      )
      if (!res.ok) throw new Error(String(res.status))
      setRenameTarget(null)
      router.refresh()
    } catch {
      toast.error(t('error:unknown'))
    } finally {
      setBusy(false)
    }
  }

  const deleteFolder = async (item: FolderItem) => {
    if (!window.confirm(`${t('folder:deleteFolder')}: ${item.value._folderOrDocumentTitle}?`)) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/${foldersSlug}/${item.value.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(String(res.status))
      router.refresh()
    } catch {
      toast.error(t('error:unknown'))
    } finally {
      setBusy(false)
    }
  }

  const moveItems = async (
    items: FolderItem[],
    toFolderID: number | string | null,
  ) => {
    if (!items.length) return
    setBusy(true)
    try {
      // Mirror Payload's FoldersProvider.moveToFolder: group by collection and
      // bulk-PATCH the folder field via the `where` endpoint, scoped to the
      // active locale (otherwise Payload validates required localized fields
      // across ALL locales and a doc with empty locales fails).
      const idsByRelation = new Map<string, (number | string)[]>()
      for (const it of items) {
        const arr = idsByRelation.get(it.relationTo) ?? []
        arr.push(it.value.id)
        idsByRelation.set(it.relationTo, arr)
      }
      for (const [relationTo, ids] of idsByRelation) {
        const params = new URLSearchParams()
        params.set('depth', '0')
        params.set('limit', '0')
        if (localeCode) params.set('locale', localeCode)
        ids.forEach((id) => params.append('where[id][in][]', String(id)))
        const res = await fetch(`/api/${relationTo}?${params.toString()}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [folderFieldName]: toFolderID ?? null }),
        })
        // Bulk update returns 200 with a per-doc `errors` array on failure.
        let json: { errors?: unknown[] } | null = null
        try {
          json = (await res.json()) as { errors?: unknown[] }
        } catch {
          json = null
        }
        if (
          !res.ok ||
          (json && Array.isArray(json.errors) && json.errors.length > 0)
        ) {
          throw new Error('move failed')
        }
      }
      clearSelection()
      router.refresh()
    } catch {
      toast.error(t('error:unknown'))
    } finally {
      setBusy(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const active = activeItem
    setActiveItem(null)
    if (!active || !event.over) return
    const overId = String(event.over.id)
    let target: number | string | null
    if (overId === DROP_ROOT) {
      target = null
    } else if (overId.startsWith('crumb:')) {
      target = overId.slice('crumb:'.length)
    } else if (overId.startsWith('folder:')) {
      target = overId.slice('folder:'.length)
    } else {
      return
    }
    // Dragging a selected item moves the whole selection; dragging an
    // unselected item moves just that item.
    const itemsToMove = (
      selected.has(active.itemKey)
        ? [...selected].map((k) => itemByKey.get(k)).filter(Boolean) as FolderItem[]
        : [active]
    ).filter(
      // Drop the target folder itself from the batch (no-op / would self-nest).
      (it) => !(it.relationTo === foldersSlug && String(it.value.id) === String(target)),
    )
    void moveItems(itemsToMove, target)
  }

  const isEmpty = subfolders.length === 0 && documents.length === 0

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveItem(itemByKey.get(String(e.active.id)) ?? null)}
      onDragCancel={() => setActiveItem(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="twp space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2">
          <Breadcrumbs
            rootLabel={rootLabel}
            breadcrumbs={breadcrumbs}
            currentFolderID={currentFolderID}
            onNavigate={navTo}
          />
          <div className="flex items-center gap-2">
            {selectMode && selected.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selected.size} selected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  disabled={busy}
                >
                  {t('general:clear') || 'Clear'}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant={selectMode ? 'secondary' : 'outline'}
              onClick={toggleSelectMode}
              disabled={busy}
              aria-pressed={selectMode}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              {selectMode ? 'Done' : 'Select'}
            </Button>
            <Button size="sm" onClick={() => setNewOpen(true)} disabled={busy}>
              <FolderPlus className="mr-2 h-4 w-4" />
              {t('folder:newFolder')}
            </Button>
          </div>
        </div>

        {isEmpty ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            This folder is empty.
          </p>
        ) : (
          <div className="space-y-6">
            {subfolders.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('folder:folders') || 'Folders'}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {subfolders.map((item) => (
                    <FolderCard
                      key={item.itemKey}
                      item={item}
                      selected={selected.has(item.itemKey)}
                      selectMode={selectMode}
                      onActivate={handleActivate}
                      onRename={() => {
                        setRenameTarget(item)
                        setRenameName(item.value._folderOrDocumentTitle)
                      }}
                      onDelete={() => deleteFolder(item)}
                      renameLabel={t('general:rename')}
                      deleteLabel={t('general:delete')}
                    />
                  ))}
                </div>
              </section>
            )}
            {documents.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('general:documents') || 'Documents'}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {documents.map((item) => (
                    <DocCard
                      key={item.itemKey}
                      item={item}
                      selected={selected.has(item.itemKey)}
                      selectMode={selectMode}
                      onActivate={handleActivate}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-lg">
            {activeItem.relationTo === foldersSlug ? (
              <Folder className="h-4 w-4" />
            ) : (
              <FileIcon className="h-4 w-4" />
            )}
            {selected.has(activeItem.itemKey) && selected.size > 1
              ? `${selected.size} items`
              : activeItem.value._folderOrDocumentTitle}
          </div>
        ) : null}
      </DragOverlay>

      {/* New folder dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="twp">
          <DialogHeader>
            <DialogTitle>{t('folder:newFolder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="shadcn-new-folder-name">{t('folder:folderName')}</Label>
            <Input
              id="shadcn-new-folder-name"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void createFolder()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewOpen(false)} disabled={busy}>
              {t('general:cancel')}
            </Button>
            <Button size="sm" onClick={() => void createFolder()} disabled={busy || !newName.trim()}>
              {t('general:create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className="twp">
          <DialogHeader>
            <DialogTitle>{t('folder:renameFolder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="shadcn-rename-folder-name">{t('folder:folderName')}</Label>
            <Input
              id="shadcn-rename-folder-name"
              value={renameName}
              autoFocus
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void renameFolder()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRenameTarget(null)} disabled={busy}>
              {t('general:cancel')}
            </Button>
            <Button size="sm" onClick={() => void renameFolder()} disabled={busy || !renameName.trim()}>
              {t('general:save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  )
}

function Breadcrumbs({
  rootLabel,
  breadcrumbs,
  currentFolderID,
  onNavigate,
}: {
  rootLabel: string
  breadcrumbs: FolderBreadcrumb[]
  currentFolderID: number | string | null
  onNavigate: (folderID: number | string | null) => void
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <CrumbDropTarget id={DROP_ROOT}>
        <button
          type="button"
          onClick={() => onNavigate(null)}
          className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground',
            currentFolderID == null && 'text-foreground',
          )}
        >
          <Home className="h-3.5 w-3.5" />
          {rootLabel}
        </button>
      </CrumbDropTarget>
      {breadcrumbs.map((crumb, i) => {
        const isLast = i === breadcrumbs.length - 1
        return (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {isLast ? (
              <span className="px-1.5 py-0.5 font-medium text-foreground">
                {crumb.name}
              </span>
            ) : (
              <CrumbDropTarget id={`crumb:${crumb.id}`}>
                <button
                  type="button"
                  onClick={() => onNavigate(crumb.id)}
                  className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
                >
                  {crumb.name}
                </button>
              </CrumbDropTarget>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

function CrumbDropTarget({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <span ref={setNodeRef} className={cn('rounded', isOver && 'bg-primary/20 ring-1 ring-primary')}>
      {children}
    </span>
  )
}

function FolderCard({
  item,
  selected,
  selectMode,
  onActivate,
  onRename,
  onDelete,
  renameLabel,
  deleteLabel,
}: {
  item: FolderItem
  selected: boolean
  selectMode: boolean
  onActivate: (item: FolderItem, opts: { shiftKey: boolean }) => void
  onRename: () => void
  onDelete: () => void
  renameLabel: string
  deleteLabel: string
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `folder:${item.value.id}`,
  })
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({ id: item.itemKey })

  return (
    <Card
      ref={(node) => {
        setDropRef(node)
        setDragRef(node)
      }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-pressed={selectMode ? selected : undefined}
      onClick={(e) => onActivate(item, { shiftKey: e.shiftKey })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate(item, { shiftKey: e.shiftKey })
        }
      }}
      className={cn(
        'relative flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-accent',
        isOver && 'bg-primary/10 ring-2 ring-primary',
        selected && 'ring-2 ring-primary',
        isDragging && 'opacity-40',
      )}
    >
      <Folder className="h-8 w-8 shrink-0 text-muted-foreground" />
      <span className="truncate text-sm">{item.value._folderOrDocumentTitle}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => onRename()}>
            <Pencil className="mr-2 h-4 w-4" />
            {renameLabel}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onDelete()} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  )
}

function DocCard({
  item,
  selected,
  selectMode,
  onActivate,
}: {
  item: FolderItem
  selected: boolean
  selectMode: boolean
  onActivate: (item: FolderItem, opts: { shiftKey: boolean }) => void
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: item.itemKey,
  })
  const { url, filename, _folderOrDocumentTitle } = item.value
  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-pressed={selectMode ? selected : undefined}
      onClick={(e) => onActivate(item, { shiftKey: e.shiftKey })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate(item, { shiftKey: e.shiftKey })
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-accent',
        selected && 'ring-2 ring-primary',
        isDragging && 'opacity-40',
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={filename ?? ''} className="h-8 w-8 shrink-0 rounded object-cover" />
      ) : (
        <FileIcon className="h-8 w-8 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate text-sm">{_folderOrDocumentTitle}</span>
    </Card>
  )
}

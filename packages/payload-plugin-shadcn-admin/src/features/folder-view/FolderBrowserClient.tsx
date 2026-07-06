'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  CheckSquare,
  File as FileIcon,
  Folder,
  FolderPlus,
} from 'lucide-react'
import { toast, useLocale, useTranslation } from '../../internal/payloadAdapterUI.js'

import { Button } from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import { Label } from 'payload-plugin-shadcn-ui'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'payload-plugin-shadcn-ui'
import { Breadcrumbs, DROP_ROOT } from './FolderBreadcrumbs.js'
import { DocCard, FolderCard } from './FolderCards.js'

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

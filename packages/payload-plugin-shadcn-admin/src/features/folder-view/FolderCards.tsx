'use client'

/* The two grid-card presentational components (a folder, or a linked
   document) rendered by FolderBrowserClient. Each is simultaneously a
   dnd-kit draggable (and, for folders, a droppable) — drag/drop wiring and
   selection state live in the parent; these only render + report clicks. */

import * as React from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import {
  File as FileIcon,
  Folder,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from 'payload-plugin-shadcn-ui'
import { Card } from 'payload-plugin-shadcn-ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import type { FolderItem } from './FolderBrowserClient.js'

export function FolderCard({
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

export function DocCard({
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

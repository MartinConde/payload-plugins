'use client'

/* Folder path breadcrumb nav, with each crumb (and the root) acting as a
   dnd-kit drop target so dragging an item onto a crumb moves it there. Split
   out of FolderBrowserClient.tsx, which owns the drag/drop + navigation
   state this renders into. */

import * as React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from 'payload-plugin-shadcn-ui'
import type { FolderBreadcrumb } from './FolderBrowserClient.js'

export const DROP_ROOT = 'crumb:__root__'

export function Breadcrumbs({
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

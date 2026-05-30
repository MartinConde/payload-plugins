'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff, GripVertical } from 'lucide-react'
import type { Column } from '@tanstack/react-table'

import { Button } from 'payload-plugin-shadcn-ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import { SortableHandleContext } from './DataTable.js'

type DataTableColumnHeaderProps<TData, TValue> = React.HTMLAttributes<HTMLDivElement> & {
  column: Column<TData, TValue>
  title: string
}

function DragHandle() {
  const ctx = React.useContext(SortableHandleContext)
  if (!ctx) return null
  return (
    <button
      type="button"
      aria-label="Reorder column"
      className={cn(
        'ml-auto inline-flex h-6 w-4 shrink-0 items-center justify-center text-muted-foreground/50',
        'opacity-0 transition-opacity group-hover/th:opacity-100',
        'hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        ctx.isDragging ? 'cursor-grabbing opacity-100' : 'cursor-grab',
      )}
      style={{ touchAction: 'none' }}
      {...ctx.attributes}
      {...ctx.listeners}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  )
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return (
      <div className={cn('flex items-center', className)}>
        <span>{title}</span>
        <DragHandle />
      </div>
    )
  }

  const sorted = column.getIsSorted()

  return (
    <div className={cn('flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              '-ml-3 h-8 text-xs font-medium tracking-wide text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground',
              sorted && 'text-foreground',
            )}
          >
            <span>{title}</span>
            {sorted === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : sorted === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-0 transition-opacity group-hover/th:opacity-100" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {column.getCanSort() && (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Asc
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Desc
              </DropdownMenuItem>
            </>
          )}
          {column.getCanSort() && column.getCanHide() && <DropdownMenuSeparator />}
          {column.getCanHide() && (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Hide
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DragHandle />
    </div>
  )
}

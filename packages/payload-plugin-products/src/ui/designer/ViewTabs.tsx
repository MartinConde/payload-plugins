'use client'

/* Tab strip above the Designer canvas. One tab per row in the `views` array,
   plus an "+ Add view" dropdown listing preset names from the plugin config and
   a free-text input for ad-hoc names. Active state is COMPONENT-LOCAL — no
   form writes on switch — so the canvas swap is instant and never triggers a
   form-server roundtrip. Add/Remove go through `useForm()`'s addFieldRow /
   removeFieldRow so Payload's form-state bookkeeping stays correct (row ids,
   modified flag, etc.). */

import * as React from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  useDocFormFieldValue,
  useDocFormSetValue,
} from 'payload-plugin-shadcn-ui'
import { useTranslation } from '@payloadcms/ui'

type ViewRow = {
  id?: string
  name?: string
}

export type ViewTabsProps = {
  active: number
  onActive: (index: number) => void
  presets: string[]
  disabled?: boolean
}

export function ViewTabs({
  active,
  onActive,
  presets,
  disabled,
}: ViewTabsProps): React.ReactElement {
  const { t } = useTranslation()
  const tr = (k: string): string => (t as (k: string) => string)(k)
  const setValueAtPath = useDocFormSetValue()
  const viewsRaw = useDocFormFieldValue('views')
  const views: ViewRow[] = Array.isArray(viewsRaw) ? (viewsRaw as ViewRow[]) : []
  const [customName, setCustomName] = React.useState('')
  const [menuOpen, setMenuOpen] = React.useState(false)

  // Clamp `active` if the row at that index disappeared. (e.g. just deleted.)
  React.useEffect(() => {
    if (views.length === 0) return
    if (active >= views.length) onActive(Math.max(0, views.length - 1))
  }, [views.length, active, onActive])

  const addView = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const newRow: ViewRow & Record<string, unknown> = {
      // Shadcn-admin's bridge fingerprints array rows by `id` (string) for its
      // structural diff (see AutoDocFormBridge's rowId helper) — give every
      // new row a stable client id immediately. The server replaces it with
      // a canonical uuid via `ensureViewId` on save.
      id: crypto.randomUUID(),
      name: trimmed,
      printAreaSource: 'template',
      printAreaPlacement: [],
    }
    setValueAtPath('views', [...views, newRow])
    setMenuOpen(false)
    setCustomName('')
    // Focus the newly-added view after the write settles.
    Promise.resolve().then(() => onActive(views.length))
  }

  const deleteView = (rowIndex: number) => {
    if (views.length <= 1) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(tr('pluginProducts:confirmDeleteView'))
    ) {
      return
    }
    const nextViews = views.filter((_, i) => i !== rowIndex)
    setValueAtPath('views', nextViews)
    if (active >= rowIndex && active > 0) onActive(active - 1)
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b">
      {views.map((row, i) => (
        <div
          key={row.id ?? i}
          className={
            'flex items-center gap-1 rounded-t-md border border-b-0 px-2 py-1 text-sm ' +
            (i === active
              ? 'bg-background font-medium text-foreground'
              : 'border-transparent bg-muted/40 text-muted-foreground hover:text-foreground')
          }
        >
          <button
            type="button"
            className="cursor-pointer outline-none"
            onClick={() => onActive(i)}
            disabled={disabled}
          >
            {row.name?.trim() || `${tr('pluginProducts:viewName')} ${i + 1}`}
          </button>
          {views.length > 1 && i === active && !disabled ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => deleteView(i)}
              title={tr('pluginProducts:deleteView')}
              aria-label={tr('pluginProducts:deleteView')}
            >
              <Trash2Icon className="size-3.5" />
            </button>
          ) : null}
        </div>
      ))}
      {!disabled ? (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="gap-1">
              <PlusIcon className="size-4" />
              {tr('pluginProducts:addView')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {presets.map((preset) => (
              <DropdownMenuItem key={preset} onSelect={() => addView(preset)}>
                {preset}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="flex items-center gap-1 px-2 py-1.5">
              <Input
                value={customName}
                placeholder={tr('pluginProducts:viewName')}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addView(customName)
                  }
                }}
                className="h-8"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => addView(customName)}
                disabled={!customName.trim()}
              >
                {tr('pluginProducts:addView')}
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

'use client'

/* Pair of controls that sit next to the "+ Add filter" pill in FilterBar:
   - "Save preset" Popover with an inline name Input + Save button.
   - "Presets" DropdownMenu listing saved presets; row click loads, × deletes.

   Presets are scoped per collection — backed by usePresets. */

import * as React from 'react'
import { BookmarkIcon, ChevronDownIcon, XIcon } from 'lucide-react'
import { useTranslation } from '../../../internal/payloadAdapter.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import { Button } from 'payload-plugin-shadcn-ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'payload-plugin-shadcn-ui'
import { PRESET_ERROR, PresetError, usePresets } from './usePresets.js'

type Props = {
  collectionSlug: string
}

export function PresetsMenu({ collectionSlug }: Props): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const { presets, loaded, atLimit, savePreset, loadPreset, deletePreset } =
    usePresets(collectionSlug)

  const [saveOpen, setSaveOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [pendingOverwrite, setPendingOverwrite] = React.useState(false)
  const [errorCode, setErrorCode] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [loadOpen, setLoadOpen] = React.useState(false)

  const resetSaveState = React.useCallback(() => {
    setName('')
    setPendingOverwrite(false)
    setErrorCode(null)
    setSaving(false)
  }, [])

  const handleSave = React.useCallback(
    async (overwrite: boolean) => {
      setSaving(true)
      setErrorCode(null)
      try {
        await savePreset(name, { overwrite })
        setSaveOpen(false)
        resetSaveState()
      } catch (err) {
        if (err instanceof PresetError) {
          if (err.code === PRESET_ERROR.NameExists) {
            setPendingOverwrite(true)
          } else {
            setErrorCode(err.code)
          }
        } else {
          setErrorCode('UNKNOWN')
        }
        setSaving(false)
      }
    },
    [name, savePreset, resetSaveState],
  )

  const onSaveOpenChange = (next: boolean) => {
    setSaveOpen(next)
    if (!next) resetSaveState()
  }

  const sortedPresets = React.useMemo(
    () => [...presets].sort((a, b) => b.createdAt - a.createdAt),
    [presets],
  )

  const trimmedEmpty = name.trim().length === 0
  const saveDisabled =
    !loaded || saving || trimmedEmpty || (atLimit && !pendingOverwrite)

  return (
    <>
      <Popover open={saveOpen} onOpenChange={onSaveOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 border border-border text-muted-foreground hover:text-foreground"
            disabled={!loaded}
          >
            <BookmarkIcon className="size-3.5" />
            {t('shadcnAdmin:savePreset')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="preset-name"
              className="text-xs font-medium text-muted-foreground"
            >
              {t('shadcnAdmin:presetName')}
            </label>
            <Input
              id="preset-name"
              autoFocus
              value={name}
              placeholder={t('shadcnAdmin:presetNamePlaceholder')}
              onChange={(e) => {
                setName(e.currentTarget.value)
                if (pendingOverwrite) setPendingOverwrite(false)
                if (errorCode) setErrorCode(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saveDisabled) {
                  e.preventDefault()
                  void handleSave(pendingOverwrite)
                }
              }}
              className="h-8 text-sm"
            />
            {pendingOverwrite ? (
              <div className="text-xs text-muted-foreground">
                {t('shadcnAdmin:presetExists', { name: name.trim() })}
              </div>
            ) : null}
            {errorCode === PRESET_ERROR.AtLimit ? (
              <div className="text-xs text-muted-foreground">
                {t('shadcnAdmin:presetAtLimit', { max: 20 })}
              </div>
            ) : null}
            {errorCode === 'UNKNOWN' ? (
              <div className="text-xs text-destructive">
                {t('shadcnAdmin:presetSaveFailed')}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => onSaveOpenChange(false)}
              >
                {t('general:cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7"
                disabled={saveDisabled}
                onClick={() => void handleSave(pendingOverwrite)}
              >
                {pendingOverwrite ? t('shadcnAdmin:replace') : t('general:save')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu open={loadOpen} onOpenChange={setLoadOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 border border-border text-muted-foreground hover:text-foreground"
          >
            {t('shadcnAdmin:presets')}
            {presets.length > 0 ? (
              <span className="rounded-sm bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                {presets.length}
              </span>
            ) : null}
            <ChevronDownIcon className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 p-1">
          {!loaded ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {t('general:loading')}
            </div>
          ) : sortedPresets.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {t('shadcnAdmin:noPresetsYet')}
            </div>
          ) : (
            sortedPresets.map((preset) => (
              <div
                key={preset.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  loadPreset(preset.id)
                  setLoadOpen(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    loadPreset(preset.id)
                    setLoadOpen(false)
                  }
                }}
                className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
              >
                <span className="flex-1 truncate">{preset.name}</span>
                <button
                  type="button"
                  aria-label={t('shadcnAdmin:deletePresetLabel', {
                    name: preset.name,
                  })}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void deletePreset(preset.id)
                  }}
                  className="-mr-1 rounded-sm p-0.5 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

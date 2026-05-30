'use client'

/* Top-level filter chip bar. Reads filter state from useFilterUrlState,
   keeps a write-behind copy via usePreferencesSync, and renders the chips
   plus a trailing "+ Add filter" pill. Renders nothing chrome when the
   state is empty other than the pill itself. */

import * as React from 'react'

import type { CollectionMeta, FieldMeta } from '../columns/fieldPicker.js'
import { useFilterUrlState } from './useFilterUrlState.js'
import { usePreferencesSync } from '../prefs/usePreferencesSync.js'
import { AddFilterMenu } from './AddFilterMenu.js'
import { FilterChip } from './FilterChip.js'
import { OrGroupWrapper } from './OrGroupWrapper.js'
import { PresetsMenu } from './PresetsMenu.js'

const SYNTHETIC_FIELDS: FieldMeta[] = [
  { type: 'text', name: 'id', label: 'ID' },
  { type: 'date', name: 'createdAt', label: 'Created' },
  { type: 'date', name: 'updatedAt', label: 'Updated' },
]

type Props = {
  collection: CollectionMeta
  useAsTitleBySlug?: Record<string, string | undefined>
}

export function FilterBar({
  collection,
  useAsTitleBySlug,
}: Props): React.ReactElement {
  const {
    state,
    addChip,
    updateChip,
    removeChip,
    moveChip,
    toggleOrJoin,
    replaceState,
    interactedRef,
  } = useFilterUrlState()

  // Track which chip should open its editor on next mount as a (field|operator)
  // key — survives the pending → URL promotion (chip ID changes on promotion
  // but field+operator stay the same).
  const [autoOpenKey, setAutoOpenKey] = React.useState<string | null>(null)

  // Clear autoOpenKey once a URL chip with that key exists — it has already
  // mounted with defaultOpen=true and now owns its popover state.
  React.useEffect(() => {
    if (autoOpenKey === null) return
    const hasUrlChip = state.nodes.some((node) => {
      if (node.kind === 'chip') {
        return `${node.chip.field}|${node.chip.operator}` === autoOpenKey &&
          node.chip.id.startsWith('c-')
      }
      return node.group.chips.some(
        (c) =>
          `${c.field}|${c.operator}` === autoOpenKey && c.id.startsWith('c-'),
      )
    })
    if (hasUrlChip) setAutoOpenKey(null)
  }, [state, autoOpenKey])

  usePreferencesSync({
    collectionSlug: collection.slug,
    state,
    onHydrate: replaceState,
    interactedRef,
  })

  // Build the list of fields available to the picker: collection's own
  // fields + synthetic id/createdAt/updatedAt. De-duplicate by name.
  const allFields = React.useMemo<FieldMeta[]>(() => {
    const seen = new Set<string>()
    const out: FieldMeta[] = []
    for (const f of collection.fields) {
      if (!f.name || seen.has(f.name)) continue
      seen.add(f.name)
      out.push(f)
    }
    for (const f of SYNTHETIC_FIELDS) {
      if (f.name && !seen.has(f.name)) {
        seen.add(f.name)
        out.push(f)
      }
    }
    return out
  }, [collection.fields])

  const handleAdd = (chip: Parameters<typeof addChip>[0]) => {
    addChip(chip)
    setAutoOpenKey(`${chip.field}|${chip.operator}`)
  }

  const renderChip = (
    chipData: Parameters<typeof FilterChip>[0]['chip'],
    options: {
      isInOrGroup: boolean
      isFirstNode: boolean
      canMoveLeft: boolean
      canMoveRight: boolean
    },
  ) => (
    <FilterChip
      key={chipData.id}
      chip={chipData}
      fields={allFields}
      useAsTitleBySlug={useAsTitleBySlug}
      isInOrGroup={options.isInOrGroup}
      isFirstNode={options.isFirstNode}
      canMoveLeft={options.canMoveLeft}
      canMoveRight={options.canMoveRight}
      defaultOpen={
        autoOpenKey !== null &&
        `${chipData.field}|${chipData.operator}` === autoOpenKey
      }
      onChange={(patch) => {
        // If the user changed field/operator while editing, the chip's React
        // key changes too (anticipated id depends on field+op). Update
        // autoOpenKey to the new (field|op) so the remounted chip opens its
        // popover immediately.
        const nextField = patch.field ?? chipData.field
        const nextOperator = patch.operator ?? chipData.operator
        if (
          (patch.field !== undefined && patch.field !== chipData.field) ||
          (patch.operator !== undefined &&
            patch.operator !== chipData.operator)
        ) {
          setAutoOpenKey(`${nextField}|${nextOperator}`)
        }
        updateChip(chipData.id, patch)
      }}
      onRemove={() => removeChip(chipData.id)}
      onMove={(d) => moveChip(chipData.id, d)}
      onToggleOrJoin={() => toggleOrJoin(chipData.id)}
    />
  )

  const lastIndex = state.nodes.length - 1

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {state.nodes.map((node, i) => {
        if (node.kind === 'chip') {
          const sep =
            i > 0 ? (
              <span
                key={`sep-${i}`}
                className="text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                and
              </span>
            ) : null
          return (
            <React.Fragment key={node.chip.id}>
              {sep}
              {renderChip(node.chip, {
                isInOrGroup: false,
                isFirstNode: i === 0,
                canMoveLeft: i > 0,
                canMoveRight: i < lastIndex,
              })}
            </React.Fragment>
          )
        }
        const sep =
          i > 0 ? (
            <span
              key={`sep-${i}`}
              className="text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              and
            </span>
          ) : null
        return (
          <React.Fragment key={node.group.id}>
            {sep}
            <OrGroupWrapper>
              {node.group.chips.map((c, j) =>
                renderChip(c, {
                  isInOrGroup: true,
                  isFirstNode: i === 0 && j === 0,
                  canMoveLeft: false,
                  canMoveRight: false,
                }),
              )}
            </OrGroupWrapper>
          </React.Fragment>
        )
      })}
      {state.nodes.length > 0 && (
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
      )}
      <AddFilterMenu fields={allFields} onAdd={handleAdd} />
      <PresetsMenu collectionSlug={collection.slug} />
    </div>
  )
}

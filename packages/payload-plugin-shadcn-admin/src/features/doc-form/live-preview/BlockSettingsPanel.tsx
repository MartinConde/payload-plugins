'use client'

/* Dedicated per-block editing panel for the Live Preview page-builder layer.
   Selecting a block in the preview (click, or the floating toolbar) shows
   ONLY that block's fields here instead of scrolling the main form to it —
   the "focused settings panel" tier of the feature (see LIVE-PREVIEW.md).

   Reuses the bridge's own field-tree recursion (`renderChild`, from
   `makeFieldTreeRenderer`) with the EXACT pattern `BlocksInput` already uses
   to render a block row's subfields (`block.fields.map(sub => renderChild(sub,
   `${nestedPath}.${idx}.`, perBlockPerms, disabled))`) — this is not a second
   field-rendering implementation, just that same call site pointed at one
   row instead of all of them.

   Every row's field group stays MOUNTED, toggled with a plain `hidden` class
   rather than a conditional return — switching the selection then causes
   zero remount (collapsed `SortableRow`s in the main `BlocksInput` already
   establish this "hidden but mounted" precedent via a `0fr/1fr` grid; a
   simple `display:none` here is equivalent and needs no transition). This
   matters because `RichTextInput` reseeds its editor state on remount — fine
   for an occasional flash, not something we want on every block click. */

import * as React from 'react'
import { Badge, usePageBuilder } from 'payload-plugin-shadcn-ui'
import type { ExtractedBlock } from 'payload-plugin-shadcn-ui'
import { useTranslation } from '../../../internal/payloadAdapter.js'
import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import type { FieldTreeRenderer } from '../fieldTree/FieldTreeRenderer.js'
import type { Perms } from '../access-control/fieldPermissions.js'
import type { BlockRow } from '../inputs/BlocksInput.js'

const blockLabelOf = (block: ExtractedBlock): string => {
  if (block.labels?.singular && block.labels.singular.length > 0)
    return block.labels.singular
  return block.slug
}

export type BlockSettingsPanelProps = {
  /** Normalized `layout` rows (same shape `BlocksInput` renders from). */
  rows: BlockRow[]
  /** The `layout` field's available block types (for labels + subfield defs). */
  blocks: ExtractedBlock[]
  /** Locale-aware base path for the layout array (e.g. `layout` or
   *  `layout.en`) — computed by the bridge the same way `FieldTreeRenderer`
   *  computes `childBasePath`, so this stays correct if `layout` is ever
   *  localized. Do not hardcode `'layout'` here. */
  layoutBasePath: string
  renderChild: FieldTreeRenderer['renderChild']
  /** The `layout` field's own FieldPermissions — forwarded per-block exactly
   *  as `BlocksInput` does (`blockPerms.blocks[row.blockType]`). */
  blockPerms?: Perms
  disabled?: boolean
}

export function BlockSettingsPanel({
  rows,
  blocks,
  layoutBasePath,
  renderChild,
  blockPerms,
  disabled,
}: BlockSettingsPanelProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const { selectedBlockId } = usePageBuilder()

  const blockBySlug = React.useMemo<Record<string, ExtractedBlock>>(() => {
    const out: Record<string, ExtractedBlock> = {}
    for (const b of blocks) out[b.slug] = b
    return out
  }, [blocks])

  const selectedRow = rows.find((r) => r.id === selectedBlockId)
  const selectedBlock = selectedRow ? blockBySlug[selectedRow.blockType] : undefined

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* No "nothing selected" hint here: the enclosing panel is collapsed to
          `0%` exactly when `selectedRow` is falsy (see the bridge's
          resize effect) — and the panel group needs `overflow: visible` for
          sticky positioning (see LIVE-PREVIEW.md), so any real content
          rendered while collapsed would visibly bleed out past the 0-width
          box rather than being clipped. Only render chrome when there's
          actually width to show it in. */}
      {selectedRow ? (
        <div className="flex shrink-0 flex-col gap-1 border-b bg-muted/20 px-4 py-3">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t('shadcnAdmin:blockSettings')}
          </span>
          <Badge variant="outline" className="w-fit text-[10px] uppercase">
            {selectedBlock
              ? blockLabelOf(selectedBlock)
              : selectedRow.blockType || 'Unknown'}
          </Badge>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 p-4">
        {rows.map((row, idx) => {
          const block = blockBySlug[row.blockType]
          if (!block) return null
          const perBlockPerms = blockPerms
            ? (blockPerms as { blocks?: Record<string, unknown> }).blocks?.[
                row.blockType
              ]
            : undefined
          return (
            <div
              key={row.id}
              className={row.id === selectedBlockId ? 'flex flex-col gap-4' : 'hidden'}
            >
              {block.fields.map((sub) =>
                renderChild(sub, `${layoutBasePath}.${idx}.`, perBlockPerms, disabled),
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

/* Visual block-type picker for `blocks` fields, styled after Payload's
   default block-selection drawer: a right-side Sheet with a search box and
   a thumbnail grid (falling back to a generic icon when a block has no
   `admin.images.thumbnail`). Blocks carrying `admin.group` are rendered
   under labeled sections, matching Payload's grouped block drawer; ungrouped
   blocks render first with no heading. */

import * as React from 'react'
import { BlocksIcon } from 'lucide-react'
import { useTranslation } from '../../../internal/payloadAdapterUI.js'

import type {
  ShadcnAdminTranslationsKeys,
  ShadcnAdminTranslationsObject,
} from '../../../translations.js'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import type { ExtractedBlock } from 'payload-plugin-shadcn-ui'

export type BlockPickerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  blocks: ExtractedBlock[]
  onSelect: (slug: string) => void
}

const blockLabelOf = (block: ExtractedBlock): string => {
  if (block.labels?.singular && block.labels.singular.length > 0)
    return block.labels.singular
  return block.slug
}

type Section = { heading: string | null; blocks: ExtractedBlock[] }

const groupBlocks = (blocks: ExtractedBlock[]): Section[] => {
  const ungrouped: ExtractedBlock[] = []
  const grouped = new Map<string, ExtractedBlock[]>()
  for (const block of blocks) {
    if (block.group) {
      const list = grouped.get(block.group) ?? []
      list.push(block)
      grouped.set(block.group, list)
    } else {
      ungrouped.push(block)
    }
  }
  const sections: Section[] = []
  if (ungrouped.length > 0) sections.push({ heading: null, blocks: ungrouped })
  for (const [heading, list] of grouped) sections.push({ heading, blocks: list })
  return sections
}

export function BlockPickerSheet({
  open,
  onOpenChange,
  blocks,
  onSelect,
}: BlockPickerSheetProps): React.ReactElement {
  const { t } = useTranslation<
    ShadcnAdminTranslationsObject,
    ShadcnAdminTranslationsKeys
  >()
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    if (open) setSearch('')
  }, [open])

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return blocks
    return blocks.filter((b) =>
      blockLabelOf(b).toLowerCase().includes(term) ||
      b.slug.toLowerCase().includes(term),
    )
  }, [blocks, search])

  const sections = React.useMemo(() => groupBlocks(filtered), [filtered])

  const handlePick = (slug: string) => {
    onSelect(slug)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{t('shadcnAdmin:addBlock')}</SheetTitle>
        </SheetHeader>

        <div className="border-b p-4">
          <Input
            placeholder={t('shadcnAdmin:searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('general:noResultsFound')}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {sections.map((section) => (
                <div key={section.heading ?? '__ungrouped'}>
                  {section.heading ? (
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      {section.heading}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {section.blocks.map((block) => (
                      <button
                        key={block.slug}
                        type="button"
                        onClick={() => handlePick(block.slug)}
                        className={cn(
                          'group flex flex-col overflow-hidden rounded-md border bg-card text-left transition-colors',
                          'hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        )}
                      >
                        <div className="aspect-[3/2] overflow-hidden bg-muted">
                          {block.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={block.thumbnail.url}
                              alt={block.thumbnail.alt ?? blockLabelOf(block)}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <BlocksIcon className="size-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="truncate text-xs font-medium">
                            {blockLabelOf(block)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

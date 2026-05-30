/* Server-side recursive walk that renders a field-by-field From→To diff for
   the version view. Mirrors Payload's own `buildVersionFields` traversal
   (group/tabs/row/collapsible/array/blocks recursion + per-locale expansion of
   localized leaves) but renders leaves with the publicly-exported
   `@payloadcms/ui` diff primitives so it stays upgrade-safe. v3.9.

   Renders only CHANGED fields (parity with Payload's default `modifiedOnly`):
   a leaf whose From and To stringify equal is dropped; a container with no
   changed descendants is dropped. */

import * as React from 'react'
import { FieldDiffContainer } from '@payloadcms/ui/elements/FieldDiffContainer'
import { getHTMLDiffComponents } from '@payloadcms/ui/elements/HTMLDiff'

import type {
  ExtractedField,
  ExtractedTab,
} from 'payload-plugin-shadcn-ui'
import type { ExtractedLocale } from '../localization/LocaleSwitcher.js'
import {
  escapeForDiff,
  richTextToDiffHTML,
  stringifyDiffValue,
} from './diffValue.js'

type Values = Record<string, unknown> | undefined

/* `@payloadcms/translations`' I18nClient isn't directly resolvable from the
   plugin (transitive dep). We only pass i18n straight through to
   FieldDiffContainer, so an opaque alias + a cast at that one call site is
   enough — no behavior depends on its shape here. */
type DiffI18n = unknown

export type BuildDiffArgs = {
  fields: ExtractedField[]
  valuesFrom: Values
  valuesTo: Values
  /** Locale codes to render for localized leaves; empty/undefined when the
   *  project has no localization. */
  selectedLocales: string[]
  /** All configured locales (for label lookup). */
  locales: ExtractedLocale[]
  i18n: DiffI18n
}

const SKIP_TYPES = new Set(['ui', 'join'])

const fieldLabel = (field: ExtractedField): string =>
  field.label ||
  (field.name
    ? field.name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '')

/** One leaf From→To row, or null when unchanged. */
function leafDiff(args: {
  field: ExtractedField
  valueFrom: unknown
  valueTo: unknown
  label: string
  locale?: string
  nestingLevel: number
  i18n: DiffI18n
  keyPrefix: string
}): React.ReactNode {
  const { field, valueFrom, valueTo, label, locale, nestingLevel, i18n, keyPrefix } = args
  // v3.24 — richText diffs structurally: serialize each side to HTML (block +
  // inline tags) so `getHTMLDiffComponents` shows paragraph↔heading, list, and
  // formatting changes, not just a flattened-text word diff. Every other leaf
  // type stays plain-text-escaped as before (v3.9).
  const isRichText = field.type === 'richText'
  const fromHTML = isRichText
    ? richTextToDiffHTML(valueFrom)
    : escapeForDiff(stringifyDiffValue(field, valueFrom))
  const toHTML = isRichText
    ? richTextToDiffHTML(valueTo)
    : escapeForDiff(stringifyDiffValue(field, valueTo))
  if (fromHTML === toHTML) return null

  const { From, To } = getHTMLDiffComponents({
    fromHTML,
    toHTML,
    tokenizeByCharacter: false,
  })

  // `getHTMLDiffComponents` returns null for an empty side (pure add/remove).
  // Substitute a muted em-dash so the before/after columns always align.
  const empty = <span className="field-diff__empty">—</span>

  return (
    <FieldDiffContainer
      key={`${keyPrefix}${locale ? `:${locale}` : ''}`}
      From={From ?? empty}
      To={To ?? empty}
      i18n={i18n as never}
      label={{ label, locale }}
      nestingLevel={nestingLevel}
    />
  )
}

/** Wrap nested rows under a labelled, indented group. Returns null when there
 *  are no changed descendants. */
function nest(
  label: string,
  rows: React.ReactNode[],
  key: string,
): React.ReactNode {
  const visible = rows.filter(Boolean)
  if (visible.length === 0) return null
  return (
    <div key={key} className="space-y-3 border-l-2 border-border pl-4">
      {label ? (
        <div className="text-[0.8125rem] font-semibold text-foreground/80">
          {label}
        </div>
      ) : null}
      <div className="space-y-3">{visible}</div>
    </div>
  )
}

function walkFields(
  fields: ExtractedField[],
  valuesFrom: Values,
  valuesTo: Values,
  ctx: { selectedLocales: string[]; i18n: DiffI18n; nestingLevel: number; path: string },
): React.ReactNode[] {
  const rows: React.ReactNode[] = []

  fields.forEach((field, idx) => {
    if (SKIP_TYPES.has(field.type) || field.hidden || field.admin?.hidden) return
    const key = `${ctx.path}.${field.name ?? field.type}.${idx}`

    switch (field.type) {
      // Presentational containers — flatten into the current value level.
      case 'row':
      case 'collapsible': {
        rows.push(
          ...walkFields(field.fields ?? [], valuesFrom, valuesTo, {
            ...ctx,
            path: key,
          }),
        )
        return
      }

      case 'tabs': {
        ;(field.tabs ?? []).forEach((tab: ExtractedTab, tIdx) => {
          const tabKey = `${key}.tab.${tIdx}`
          if (tab.name) {
            const child = walkFields(
              tab.fields,
              valuesFrom?.[tab.name] as Values,
              valuesTo?.[tab.name] as Values,
              { ...ctx, nestingLevel: ctx.nestingLevel + 1, path: tabKey },
            )
            const n = nest(tab.label || tab.name, child, tabKey)
            if (n) rows.push(n)
          } else {
            rows.push(
              ...walkFields(tab.fields, valuesFrom, valuesTo, {
                ...ctx,
                path: tabKey,
              }),
            )
          }
        })
        return
      }

      case 'group': {
        if (!field.name) return
        const child = walkFields(
          field.fields ?? [],
          valuesFrom?.[field.name] as Values,
          valuesTo?.[field.name] as Values,
          { ...ctx, nestingLevel: ctx.nestingLevel + 1, path: key },
        )
        const n = nest(fieldLabel(field), child, key)
        if (n) rows.push(n)
        return
      }

      case 'array': {
        if (!field.name) return
        const fromArr = (valuesFrom?.[field.name] as unknown[]) ?? []
        const toArr = (valuesTo?.[field.name] as unknown[]) ?? []
        const len = Math.max(fromArr.length, toArr.length)
        const childRows: React.ReactNode[] = []
        for (let i = 0; i < len; i++) {
          const itemRows = walkFields(
            field.fields ?? [],
            fromArr[i] as Values,
            toArr[i] as Values,
            { ...ctx, nestingLevel: ctx.nestingLevel + 1, path: `${key}.${i}` },
          )
          const n = nest(`Item ${i + 1}`, itemRows, `${key}.${i}`)
          if (n) childRows.push(n)
        }
        const n = nest(fieldLabel(field), childRows, key)
        if (n) rows.push(n)
        return
      }

      case 'blocks': {
        if (!field.name) return
        const fromArr = (valuesFrom?.[field.name] as Array<Record<string, unknown>>) ?? []
        const toArr = (valuesTo?.[field.name] as Array<Record<string, unknown>>) ?? []
        const len = Math.max(fromArr.length, toArr.length)
        const childRows: React.ReactNode[] = []
        for (let i = 0; i < len; i++) {
          const blockType = String(
            (toArr[i]?.blockType ?? fromArr[i]?.blockType) ?? '',
          )
          const schema = field.blocks?.find((b) => b.slug === blockType)
          if (!schema) continue
          const itemRows = walkFields(
            schema.fields,
            fromArr[i] as Values,
            toArr[i] as Values,
            { ...ctx, nestingLevel: ctx.nestingLevel + 1, path: `${key}.${i}` },
          )
          const label = `${schema.labels?.singular || blockType} ${i + 1}`
          const n = nest(label, itemRows, `${key}.${i}`)
          if (n) childRows.push(n)
        }
        const n = nest(fieldLabel(field), childRows, key)
        if (n) rows.push(n)
        return
      }

      // Leaf fields.
      default: {
        if (!field.name) return
        const rawFrom = valuesFrom?.[field.name]
        const rawTo = valuesTo?.[field.name]
        const label = fieldLabel(field)

        if (field.localized && ctx.selectedLocales.length > 0) {
          for (const locale of ctx.selectedLocales) {
            const row = leafDiff({
              field,
              valueFrom: (rawFrom as Record<string, unknown> | undefined)?.[locale],
              valueTo: (rawTo as Record<string, unknown> | undefined)?.[locale],
              label,
              locale,
              nestingLevel: ctx.nestingLevel,
              i18n: ctx.i18n,
              keyPrefix: key,
            })
            if (row) rows.push(row)
          }
        } else {
          const row = leafDiff({
            field,
            valueFrom: rawFrom,
            valueTo: rawTo,
            label,
            nestingLevel: ctx.nestingLevel,
            i18n: ctx.i18n,
            keyPrefix: key,
          })
          if (row) rows.push(row)
        }
      }
    }
  })

  return rows
}

/** Entry point — returns the rendered diff rows (changed fields only). */
export function buildDiffFields(args: BuildDiffArgs): React.ReactNode[] {
  return walkFields(args.fields, args.valuesFrom, args.valuesTo, {
    selectedLocales: args.selectedLocales,
    i18n: args.i18n,
    nestingLevel: 0,
    path: 'root',
  })
}

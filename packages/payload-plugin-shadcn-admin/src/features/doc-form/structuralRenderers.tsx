'use client'

/* Structural renderers for group + tabs. Mirrors the row/collapsible pattern
   that lives inline in AutoDocFormBridge's renderStructure. The bridge passes
   a renderChild callback so these helpers don't need to know about field
   values, errors, or dirty state — they only handle layout + nested-path
   bookkeeping.

   v3.7 access-control: renderChild's third arg carries the sanitized
   FieldPermissions of the parent container, so children can be gated on
   `canRead` / `canUpdate`. Containers also use `isFieldVisible` to hide
   themselves when every child is read-denied. */

import * as React from 'react'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'payload-plugin-shadcn-ui'
import type { ExtractedField, ExtractedTab } from 'payload-plugin-shadcn-ui'
import {
  canRead,
  isFieldVisible,
  subPerms,
  type Perms,
} from './access-control/fieldPermissions.js'

const labelOf = (field: ExtractedField): string =>
  field.label && field.label.length > 0 ? field.label : (field.name ?? '')

const tabLabelOf = (tab: ExtractedTab, idx: number): string => {
  if (tab.label && tab.label.length > 0) return tab.label
  if (tab.name && tab.name.length > 0) return tab.name
  return `Tab ${idx + 1}`
}

const tabValueOf = (tab: ExtractedTab, idx: number): string =>
  tab.name && tab.name.length > 0 ? tab.name : `__unnamed_${idx}`

export type RenderChild = (
  child: ExtractedField,
  pathPrefix: string,
  parentPerms?: Perms,
) => React.ReactNode

export function GroupSection({
  field,
  pathPrefix,
  parentPerms,
  renderChild,
}: {
  field: ExtractedField
  /** The prefix already includes the group's own name (e.g. `myGroup.`). */
  pathPrefix: string
  /** The PARENT's perms map — the group's own perms are derived inside. */
  parentPerms?: Perms
  renderChild: RenderChild
}): React.ReactElement | null {
  const children = field.fields ?? []
  if (children.length === 0) return null
  // The group's own perms object (with .fields for its children). When the
  // group field has no perms entry, undefined → all children allowed by
  // default (Payload convention).
  const groupPerms: Perms = field.name
    ? subPerms(parentPerms, field.name)
    : parentPerms
  // Hide whole group when every child is read-denied.
  if (!children.some((c) => isFieldVisible(c, groupPerms))) return null
  const label = labelOf(field)
  return (
    <section className="flex flex-col gap-3 rounded-md border p-3">
      {label ? (
        <header className="text-sm font-medium text-foreground">{label}</header>
      ) : null}
      <div className="flex flex-col gap-4">
        {children.map((child) => renderChild(child, pathPrefix, groupPerms))}
      </div>
    </section>
  )
}

export function TabsSection({
  field,
  pathPrefix,
  parentPerms,
  renderChild,
}: {
  field: ExtractedField
  /** Prefix at the field-level (the tabs container has no name).
   *  Each named tab adds its own segment via renderChild. */
  pathPrefix: string
  parentPerms?: Perms
  renderChild: RenderChild
}): React.ReactElement | null {
  const tabs = field.tabs ?? []
  if (tabs.length === 0) return null

  // Filter to tabs the user can see anything in. A named tab is gated by
  // its own `canRead` first (it's a perms node); then either named or
  // unnamed tabs need at least one visible child.
  const visibleTabs = tabs.filter((tab) => {
    if (tab.name && !canRead(parentPerms, tab.name)) return false
    const tabPerms = tab.name ? subPerms(parentPerms, tab.name) : parentPerms
    return tab.fields.some((c) => isFieldVisible(c, tabPerms))
  })
  if (visibleTabs.length === 0) return null

  const first = visibleTabs[0]
  if (!first) return null
  const firstIdx = tabs.indexOf(first)
  return (
    <Tabs defaultValue={tabValueOf(first, firstIdx)} className="w-full">
      <TabsList>
        {visibleTabs.map((tab) => {
          const idx = tabs.indexOf(tab)
          return (
            <TabsTrigger key={tabValueOf(tab, idx)} value={tabValueOf(tab, idx)}>
              {tabLabelOf(tab, idx)}
            </TabsTrigger>
          )
        })}
      </TabsList>
      {visibleTabs.map((tab) => {
        const idx = tabs.indexOf(tab)
        const tabPrefix =
          tab.name && tab.name.length > 0
            ? `${pathPrefix}${tab.name}.`
            : pathPrefix
        const tabPerms: Perms = tab.name
          ? subPerms(parentPerms, tab.name)
          : parentPerms
        return (
          <TabsContent
            key={tabValueOf(tab, idx)}
            value={tabValueOf(tab, idx)}
            className="flex flex-col gap-4 pt-2"
          >
            {tab.fields.map((child) => renderChild(child, tabPrefix, tabPerms))}
          </TabsContent>
        )
      })}
    </Tabs>
  )
}

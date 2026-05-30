'use client'

import * as React from 'react'
import { Database, type LucideIcon } from 'lucide-react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from 'payload-plugin-shadcn-ui'
import { useActiveMatcher } from './useActiveMatcher.js'

export type SidebarCollectionItem = {
  slug: string
  label: string
  href?: string
  icon?: LucideIcon
}

type CollectionsSidebarGroupProps = {
  collections: SidebarCollectionItem[]
  /** Group label shown above the list. Pass `null` to omit. Defaults to "Collections". */
  label?: string | null
  /** Fallback icon for items without one. Defaults to lucide's Database. */
  defaultIcon?: LucideIcon
}

export function CollectionsSidebarGroup({
  collections,
  label = 'Collections',
  defaultIcon: DefaultIcon = Database,
}: CollectionsSidebarGroupProps) {
  const isActive = useActiveMatcher()
  if (collections.length === 0) return null
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {collections.map((c) => {
            const Icon = c.icon ?? DefaultIcon
            const href = c.href ?? `/admin/collections/${c.slug}`
            return (
              <SidebarMenuItem key={c.slug}>
                <SidebarMenuButton tooltip={c.label} isActive={isActive(href)} asChild>
                  <a href={href}>
                    <Icon />
                    <span>{c.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

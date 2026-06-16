'use client'

import * as React from 'react'
import * as LucideIcons from 'lucide-react'
import { Box, ChevronRight } from 'lucide-react'

import {
  CollectionsSidebarGroup,
  type SidebarCollectionItem,
} from './CollectionsSidebarGroup.js'
import { NavUser, type NavUserUser } from './NavUser.js'
import { RebuildFrontendButton } from './RebuildFrontendButton.js'
import { ThemeSwitcher } from './ThemeSwitcher.js'
import { UiFlavorProvider } from './ThemeProvider.js'
import { useActiveMatcher } from './useActiveMatcher.js'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'payload-plugin-shadcn-ui'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from 'payload-plugin-shadcn-ui'

/* Icons may be specified two ways:
   - a PascalCase string name from lucide-react (e.g. 'Users', 'Image',
     'Settings2'). Always works when configured via plugin options because
     strings serialize cleanly across the RSC→Client boundary.
   - a React component that accepts `className`. Only works when the config
     originates from a bundled module (e.g. a hand-written Nav.tsx in the
     Next.js app); components imported in the unbundled `payload.config.ts`
     resolve to raw forwardRef objects that can't cross the boundary. */
export type IconRef =
  | string
  | React.ComponentType<{ className?: string }>

/** @deprecated alias for IconRef — retained for older consumer code. */
export type IconComponent = IconRef

export type AdminBranding = {
  /** Top-line label (e.g. "CMS", your product name). */
  name: string
  /** Optional subtitle under the name. Defaults to "Payload admin". */
  subtitle?: string
  /** Lucide icon name (string) or a component with `className`. See IconRef. */
  icon?: IconRef
  /** Where the branding tile links to. Defaults to `/admin`. */
  href?: string
}

export type NavItem = {
  /** Visible label. Required. */
  label: string
  /** Explicit href. Takes precedence over `collectionSlug` / `globalSlug`. */
  href?: string
  /** Shortcut: resolves to `/admin/collections/{slug}`. */
  collectionSlug?: string
  /** Shortcut: resolves to `/admin/globals/{slug}`. */
  globalSlug?: string
  /** Optional icon — lucide name string or component. */
  icon?: IconRef
  /** Sub-items render as a `<Collapsible>` with `<SidebarMenuSub>` children.
   *  When provided, the parent itself toggles the collapsible (no nav). */
  items?: NavItem[]
}

export type NavGroup = {
  /** Optional section header (e.g. "Platform"). Omit for an unlabelled group. */
  label?: string
  items: NavItem[]
}

type DefaultAdminSidebarProps = Omit<React.ComponentProps<typeof Sidebar>, 'children'> & {
  user: NavUserUser
  branding?: AdminBranding
  /** Explicit sidebar tree. When provided, replaces the default flat
   *  collections list. */
  groups?: NavGroup[]
  /** Legacy: flat list of collections. Used as the default group when
   *  `groups` is not provided. */
  collections?: SidebarCollectionItem[]
  /** Optional extra content rendered inside `<SidebarContent>` after the
   *  primary groups (e.g. consumer-defined custom links). */
  children?: React.ReactNode
  /** When set, renders a "Rebuild Frontend" button in the sidebar footer
   *  above the user menu. Provided by the plugin when `rebuildFrontend`
   *  is enabled in the plugin options. */
  rebuildFrontend?: { label: string; endpointPath: string }
}

/* Resolves an IconRef to a renderable component. String → lucide lookup;
   component → returned as-is; missing/unknown → null. */
const resolveIcon = (
  ref: IconRef | undefined,
): React.ComponentType<{ className?: string }> | null => {
  if (!ref) return null
  if (typeof ref === 'string') {
    const Icon = (LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ className?: string }> | undefined
    >)[ref]
    return Icon ?? null
  }
  return ref
}

const Icon = ({
  icon,
  className,
}: {
  icon: IconRef | undefined
  className?: string
}) => {
  const Resolved = resolveIcon(icon)
  return Resolved ? <Resolved className={className} /> : null
}

const resolveHref = (item: NavItem): string | undefined => {
  if (item.href) return item.href
  if (item.collectionSlug) return `/admin/collections/${item.collectionSlug}`
  if (item.globalSlug) return `/admin/globals/${item.globalSlug}`
  return undefined
}

const itemKey = (item: NavItem, idx: number): string =>
  item.href ?? item.collectionSlug ?? item.globalSlug ?? `${item.label}:${idx}`

function RenderNavItem({ item }: { item: NavItem }) {
  const href = resolveHref(item)
  const hasChildren = (item.items?.length ?? 0) > 0
  const isActive = useActiveMatcher()

  if (hasChildren) {
    // Parent highlights when it (or any child) matches the current route.
    const parentActive =
      isActive(href) || item.items!.some((sub) => isActive(resolveHref(sub)))
    return (
      <Collapsible asChild className="group/collapsible" defaultOpen={parentActive}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.label} isActive={parentActive}>
              <Icon icon={item.icon} className="size-4" />
              <span>{item.label}</span>
              <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items!.map((sub, i) => (
                <SidebarMenuSubItem key={itemKey(sub, i)}>
                  <SidebarMenuSubButton asChild isActive={isActive(resolveHref(sub))}>
                    <a href={resolveHref(sub) ?? '#'}>
                      <Icon icon={sub.icon} className="size-4" />
                      <span>{sub.label}</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  // Leaf item — render as a link.
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={item.label} isActive={isActive(href)} asChild>
        <a href={href ?? '#'}>
          <Icon icon={item.icon} className="size-4" />
          <span>{item.label}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function DefaultAdminSidebar({
  user,
  branding,
  groups,
  collections,
  children,
  rebuildFrontend,
  collapsible = 'icon',
  ...sidebarProps
}: DefaultAdminSidebarProps) {
  const {
    name = 'CMS',
    subtitle = 'Payload admin',
    icon: brandIconRef,
    href = '/admin',
  } = branding ?? {}

  const BrandIcon = resolveIcon(brandIconRef) ?? Box

  return (
    <UiFlavorProvider>
    <Sidebar collapsible={collapsible} {...sidebarProps}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href={href}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BrandIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups && groups.length > 0 ? (
          groups.map((group, gi) => (
            <SidebarGroup key={group.label ?? `group:${gi}`}>
              {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
              <SidebarMenu>
                {group.items.map((item, i) => (
                  <RenderNavItem key={itemKey(item, i)} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))
        ) : (
          <CollectionsSidebarGroup collections={collections ?? []} />
        )}
        {children}
      </SidebarContent>

      <SidebarFooter>
        {rebuildFrontend ? <RebuildFrontendButton {...rebuildFrontend} /> : null}
        <NavUser user={user} extraItems={<ThemeSwitcher />} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    </UiFlavorProvider>
  )
}

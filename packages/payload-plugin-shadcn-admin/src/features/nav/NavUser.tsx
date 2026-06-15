'use client'

import * as React from 'react'
import { ChevronsUpDown, LogOut, User } from 'lucide-react'
import { useTranslation } from '../../internal/payloadAdapter.js'

import { Avatar, AvatarFallback, AvatarImage } from 'payload-plugin-shadcn-ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'payload-plugin-shadcn-ui'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from 'payload-plugin-shadcn-ui'

export type NavUserUser = {
  name: string
  email: string
  avatar?: string
}

type NavUserProps = {
  user: NavUserUser
  /** Defaults to `/admin/account`. Set to null to hide the account item. */
  accountHref?: string | null
  /** Defaults to `/admin/logout`. Set to null to hide the logout item. */
  logoutHref?: string | null
  /** Extra menu items rendered between the account link and the logout row. */
  extraItems?: React.ReactNode
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function NavUser({ user, accountHref = '/admin/account', logoutHref = '/admin/logout', extraItems }: NavUserProps) {
  const { isMobile } = useSidebar()
  const { t } = useTranslation()
  const fallback = initials(user.name || user.email || '?')

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                  <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            {accountHref && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <a href={accountHref}>
                      <User />
                      {t('authentication:account')}
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
            {extraItems && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>{extraItems}</DropdownMenuGroup>
              </>
            )}
            {logoutHref && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={logoutHref}>
                    <LogOut />
                    {t('authentication:logOut')}
                  </a>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

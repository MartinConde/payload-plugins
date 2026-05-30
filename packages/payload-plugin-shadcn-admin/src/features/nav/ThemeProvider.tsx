'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

/* Flavor axis ([data-ui-theme] on <html>), independent of Payload's light/dark
   ([data-theme]). Mounted in DefaultAdminSidebar — i.e. the always-present
   shell — NOT in Payload's `admin.components.providers` nest. This matters:
   the theme switcher lives inside the account dropdown, which only renders
   while open, so it CANNOT own the attribute (it would vanish on close /
   navigation). The provider here stays mounted with the sidebar and re-applies
   on every navigation, because Payload re-renders `<html data-theme>` on route
   changes and React strips imperatively-set attributes it doesn't own.

   Default 'minimal' = bare :root tokens, so default users never flash. */

export type UiFlavor = 'minimal' | 'vibrant'

const STORAGE_KEY = 'shadcn-admin-ui-theme'

type FlavorContext = {
  flavor: UiFlavor
  setFlavor: (flavor: UiFlavor) => void
}

const Context = React.createContext<FlavorContext | null>(null)

function readStored(): UiFlavor {
  if (typeof window === 'undefined') return 'minimal'
  return window.localStorage.getItem(STORAGE_KEY) === 'vibrant'
    ? 'vibrant'
    : 'minimal'
}

export function UiFlavorProvider({ children }: { children: React.ReactNode }) {
  const [flavor, setFlavorState] = React.useState<UiFlavor>(readStored)
  const pathname = usePathname()

  // Re-apply on flavor change AND after navigation (pathname dep) — a soft nav
  // re-renders <html> and drops our attribute, so we restore it each time.
  React.useEffect(() => {
    document.documentElement.dataset.uiTheme = flavor
  }, [flavor, pathname])

  const setFlavor = React.useCallback((next: UiFlavor) => {
    setFlavorState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode / storage disabled — keep in-memory only */
    }
  }, [])

  const value = React.useMemo(() => ({ flavor, setFlavor }), [flavor, setFlavor])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useUiFlavor(): FlavorContext {
  const ctx = React.useContext(Context)
  if (!ctx) {
    throw new Error('useUiFlavor must be used within a UiFlavorProvider')
  }
  return ctx
}

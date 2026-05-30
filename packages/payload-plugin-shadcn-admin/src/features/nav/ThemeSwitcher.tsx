'use client'

import * as React from 'react'
import { Moon, Palette, Sun } from 'lucide-react'

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from 'payload-plugin-shadcn-ui'
import { useUiFlavor } from './ThemeProvider.js'

/* Two-axis theme control rendered into NavUser's `extraItems` slot.
   - Appearance (light/dark) is owned here rather than via Payload's useTheme:
     we read/write the same `payload-theme` cookie Payload SSRs from and set
     [data-theme] on <html> directly. No provider or re-apply-on-nav is needed
     for this axis — Payload re-renders <html data-theme> from that cookie on
     every navigation, and this dropdown remounts on open so readMode() keeps
     the radio in sync. The cookie name mirrors Payload's
     `${cookiePrefix||'payload'}-theme`; if a custom cookiePrefix is set,
     update THEME_COOKIE to match.
   - Flavor (minimal/vibrant) reads/writes the UiFlavorProvider that lives in
     the always-mounted sidebar. The switcher is inside the account dropdown
     (only rendered while open), so it must NOT own the attribute itself —
     the provider does, and survives close/navigation. See ThemeProvider. */

type UiMode = 'light' | 'dark'

const THEME_COOKIE = 'payload-theme'

function readMode(): UiMode {
  if (typeof window === 'undefined') return 'light'
  const fromCookie = window.document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${THEME_COOKIE}=`))
    ?.split('=')[1]
  if (fromCookie === 'light' || fromCookie === 'dark') return fromCookie
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyMode(mode: UiMode) {
  const d = new Date()
  d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000)
  document.cookie = `${THEME_COOKIE}=${mode};expires=${d.toUTCString()};path=/`
  document.documentElement.setAttribute('data-theme', mode)
}

export function ThemeSwitcher() {
  const [mode, setModeState] = React.useState<UiMode>(readMode)
  const setMode = React.useCallback((next: UiMode) => {
    setModeState(next)
    applyMode(next)
  }, [])
  const { flavor, setFlavor } = useUiFlavor()

  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
        <Sun className="size-3.5" />
        Appearance
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={mode}
        onValueChange={(v) => setMode(v === 'dark' ? 'dark' : 'light')}
      >
        <DropdownMenuRadioItem value="light">
          <Sun className="size-4" />
          Light
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark">
          <Moon className="size-4" />
          Dark
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>

      <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
        <Palette className="size-3.5" />
        Theme
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={flavor}
        onValueChange={(v) => setFlavor(v === 'vibrant' ? 'vibrant' : 'minimal')}
      >
        <DropdownMenuRadioItem value="minimal">Minimal</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="vibrant">Vibrant</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  )
}

'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { SidebarProvider } from 'payload-plugin-shadcn-ui'
import { SkippedDocViewsBanner } from './SkippedDocViewsBanner.js'

/* Mirrors Payload core's own `RouteCache` provider fix (see
   https://github.com/payloadcms/payload/issues/12914, fixed by
   https://github.com/payloadcms/payload/pull/13913): Next's App Router
   Router Cache can restore a previously-committed RSC tree with stale data
   on browser back/forward (`popstate`), independent of `staleTimes` (which
   only governs forward/soft navigation). The fix arms a flag on `popstate`
   and defers the actual `router.refresh()` to a `usePathname()`-driven
   effect, so the refresh only fires once Next's router has committed the
   new pathname — calling `router.refresh()` directly inside the `popstate`
   handler risks running it before that commit, against the still-current
   pre-restore route.

   Separately, under `next dev` with Turbopack (Next 16.2.9) we've also seen
   `popstate` fire but Next's router never transition at all — `usePathname()`
   never updates and no re-render happens, so the previous view stays on
   screen indefinitely. That's a platform-level dev-mode issue upstream (no
   clean fix landed as of writing — closest reports are
   https://github.com/vercel/next.js/issues/93905 and
   https://github.com/vercel/next.js/issues/94254); no popstate/refresh call
   can fix it because the router itself never re-renders to run one. As a
   last-resort net, if the pathname hasn't caught up with the URL bar
   shortly after a `popstate`, force a full reload — matching what a manual
   reload already did, just automatic. */
function useBackForwardRefresh() {
  const pathname = usePathname()
  const router = useRouter()
  const pathnameRef = React.useRef(pathname)
  pathnameRef.current = pathname

  const refreshOnNextPathnameChange = React.useRef(false)
  const staleNavigationTimer = React.useRef<number | null>(null)

  React.useEffect(() => {
    const onPopState = () => {
      refreshOnNextPathnameChange.current = true

      const targetPathname = window.location.pathname
      if (staleNavigationTimer.current !== null) {
        window.clearTimeout(staleNavigationTimer.current)
      }
      staleNavigationTimer.current = window.setTimeout(() => {
        staleNavigationTimer.current = null
        if (pathnameRef.current !== targetPathname) {
          window.location.reload()
        }
      }, 500)
    }
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      if (staleNavigationTimer.current !== null) {
        window.clearTimeout(staleNavigationTimer.current)
      }
    }
  }, [])

  const handlePathnameChange = React.useEffectEvent(() => {
    if (refreshOnNextPathnameChange.current) {
      refreshOnNextPathnameChange.current = false
      router.refresh()
    }
  })

  React.useEffect(() => {
    handlePathnameChange()
  }, [pathname])
}

/* Blocking script that applies the saved theme-flavor to <html> DURING HTML
   parse — before any themed content paints — so vibrant users don't see a
   minimal→vibrant flash on full page loads. Mirrors next-themes' approach.
   It runs once on initial load; runtime switching and re-applying after soft
   navigation are handled by UiFlavorProvider (mounted in the sidebar). Reads
   the same localStorage key the provider writes. */
const FLAVOR_BOOT_SCRIPT = `try{var f=localStorage.getItem('shadcn-admin-ui-theme');document.documentElement.dataset.uiTheme=f==='vibrant'?'vibrant':'minimal';}catch(e){}`

/* Hoist shadcn's SidebarProvider above the entire admin so that the Sidebar
   (rendered in the Nav slot) and SidebarTrigger (rendered inside views) share
   the same React context. display:contents makes the wrapper layout-neutral
   so Payload's own DOM flow is preserved; CSS custom properties set inline by
   SidebarProvider still cascade to descendants.

   The flavor context provider itself (UiFlavorProvider) lives in
   DefaultAdminSidebar, not here — see ThemeProvider.tsx.

   The boot <script> is rendered ONLY during the server pass (`typeof window ===
   'undefined'`). It must reach the initial SSR HTML to run before paint, but
   re-rendering an inline <script> on the CLIENT (hydration / soft nav) trips
   React 19's "scripts inside React components are never executed when rendering
   on the client" error. Payload mounts this in its client provider chain, so a
   server-component split doesn't escape the client render — the env guard does.
   React keeps the already-parsed server <script> in the DOM; the client simply
   never re-emits it. */
export default function AdminProviders({ children }: { children: React.ReactNode }) {
  useBackForwardRefresh()
  return (
    <>
      {typeof window === 'undefined' ? (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: FLAVOR_BOOT_SCRIPT }}
        />
      ) : null}
      <SidebarProvider style={{ display: 'contents' }}>
        {children}
        <SkippedDocViewsBanner />
      </SidebarProvider>
    </>
  )
}

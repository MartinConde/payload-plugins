'use client'

/* shadcn-styled replacement for Payload's `LogoutClient`
   (node_modules/@payloadcms/next/dist/views/Logout/LogoutClient.js).
   - Normal logout: calls `useAuth().logOut()` once on mount, toasts success,
     then redirects to the login route.
   - Inactivity logout: the session is already cleared upstream, so it just
     shows the "logged out due to inactivity" notice + a "log back in" button. */

import * as React from 'react'
import { useRouter } from 'next/navigation.js'
import { toast, useAuth, useConfig, useTranslation } from '../../internal/payloadAdapter.js'
import { formatAdminURL } from '../../internal/payloadAdapter.js'

import { AuthShell } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'

type LogoutClientProps = {
  inactivity?: boolean
  redirect?: string
}

export function LogoutClient({ inactivity, redirect }: LogoutClientProps) {
  const { config } = useConfig()
  const {
    admin: { routes: { login: loginRoute } },
    routes: { admin: adminRoute },
  } = config
  const { logOut, user } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const ranRef = React.useRef(false)

  const loginURL = formatAdminURL({
    adminRoute,
    path: loginRoute,
  }) + (redirect ? `?redirect=${encodeURIComponent(redirect)}` : '')

  React.useEffect(() => {
    if (inactivity) return
    if (ranRef.current) return
    ranRef.current = true
    void (async () => {
      await logOut()
      toast.success(t('authentication:loggedOutSuccessfully'))
      router.push(loginURL)
    })()
  }, [inactivity, logOut, router, t, loginURL])

  if (inactivity) {
    return (
      <AuthShell title={t('authentication:loggedOutInactivity')}>
        <Button asChild className="w-full">
          <a href={loginURL}>{t('authentication:logBackIn')}</a>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('authentication:loggingOut')}>
      <p className="text-sm text-muted-foreground">
        {user
          ? t('authentication:loggingOut')
          : t('authentication:loggedOutSuccessfully')}
      </p>
    </AuthShell>
  )
}

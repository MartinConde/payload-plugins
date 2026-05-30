'use client'

/* shadcn-styled replacement for Payload's `LoginForm`
   (node_modules/@payloadcms/next/dist/views/Login/LoginForm/index.js).
   Functionally 1:1: POSTs to `{apiRoute}/{userSlug}/login`, calls
   `useAuth().setUser(data)` on success, then redirects to the validated
   `?redirect` target (falling back to the admin route). Login field is
   email / username / emailOrUsername per the user collection's auth options.
   Rendered with vendored shadcn primitives inside the AuthShell card instead
   of Payload's `Form`/`PasswordField` chrome. */

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation.js'
import { toast, useAuth, useConfig, useTranslation } from '../../internal/payloadAdapter.js'
import { formatAdminURL, getSafeRedirect } from '../../internal/payloadAdapter.js'

import { AuthShell } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import { Label } from 'payload-plugin-shadcn-ui'

type LoginFormProps = {
  beforeLogin?: React.ReactNode
  afterLogin?: React.ReactNode
}

export function LoginForm({ beforeLogin, afterLogin }: LoginFormProps) {
  const { config, getEntityConfig } = useConfig()
  const {
    admin: { routes: { forgot: forgotRoute }, user: userSlug },
    routes: { admin: adminRoute, api: apiRoute },
  } = config
  const { t } = useTranslation()
  const { setUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const collectionConfig = getEntityConfig({ collectionSlug: userSlug })
  const loginWithUsername = (collectionConfig as any)?.auth?.loginWithUsername
  const canLoginWithEmail =
    !loginWithUsername || loginWithUsername.allowEmailLogin
  const canLoginWithUsername = Boolean(loginWithUsername)
  const loginType: 'email' | 'username' | 'emailOrUsername' =
    canLoginWithEmail && canLoginWithUsername
      ? 'emailOrUsername'
      : canLoginWithUsername
        ? 'username'
        : 'email'

  const [identifier, setIdentifier] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const redirectTarget = getSafeRedirect({
    fallbackTo: adminRoute,
    redirectTo: searchParams?.get('redirect') ?? undefined,
  })

  const loginLabel =
    loginType === 'email'
      ? t('general:email')
      : loginType === 'username'
        ? t('authentication:username')
        : t('authentication:emailOrUsername')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, string> = { password }
      // emailOrUsername: Payload's login endpoint accepts either key; pick
      // `email` when the value looks like an address, otherwise `username`.
      if (loginType === 'username') body.username = identifier
      else if (loginType === 'email') body.email = identifier
      else if (identifier.includes('@')) body.email = identifier
      else body.username = identifier

      const res = await fetch(
        formatAdminURL({ apiRoute, path: `/${userSlug}/login` }),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const json = (await res.json().catch(() => ({}))) as {
        user?: unknown
        message?: string
        errors?: { message?: string }[]
      }
      if (!res.ok || !json.user) {
        const message =
          json.errors?.[0]?.message ?? json.message ?? t('error:unknown')
        setError(message)
        toast.error(message)
        return
      }
      setUser(json as never)
      router.push(redirectTarget)
    } catch {
      const message = t('error:unknown')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('authentication:login')}>
      {beforeLogin}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-identifier">{loginLabel}</Label>
          <Input
            id="login-identifier"
            type={loginType === 'email' ? 'email' : 'text'}
            autoComplete={loginType === 'username' ? 'username' : 'email'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            disabled={loading}
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">{t('general:password')}</Label>
            <a
              href={formatAdminURL({ adminRoute, path: forgotRoute })}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t('authentication:forgotPasswordQuestion')}
            </a>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            aria-invalid={error ? true : undefined}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? `${t('authentication:login')}…` : t('authentication:login')}
        </Button>
      </form>
      {afterLogin}
    </AuthShell>
  )
}

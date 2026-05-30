'use client'

/* shadcn-styled replacement for Payload's `ForgotPasswordForm`
   (node_modules/@payloadcms/next/dist/views/ForgotPassword/ForgotPasswordForm).
   POSTs to `{apiRoute}/{userSlug}/forgot-password` with `email` (or `username`
   when the collection logs in with usernames). On success it swaps to an
   "email sent" confirmation. The actual reset link in the email still routes to
   Payload's default reset view — that view isn't overridable in 3.84.1. */

import * as React from 'react'
import { toast, useConfig, useTranslation } from '../../internal/payloadAdapter.js'
import { formatAdminURL } from '../../internal/payloadAdapter.js'

import { AuthShell } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import { Label } from 'payload-plugin-shadcn-ui'

export function ForgotPasswordForm() {
  const { config, getEntityConfig } = useConfig()
  const {
    admin: { routes: { login: loginRoute }, user: userSlug },
    routes: { admin: adminRoute, api: apiRoute },
  } = config
  const { t } = useTranslation()

  const collectionConfig = getEntityConfig({ collectionSlug: userSlug })
  const loginWithUsername = Boolean((collectionConfig as any)?.auth?.loginWithUsername)

  const [value, setValue] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [submitted, setSubmitted] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        formatAdminURL({ apiRoute, path: `/${userSlug}/forgot-password` }),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            loginWithUsername ? { username: value } : { email: value },
          ),
        },
      )
      if (!res.ok) {
        const message = loginWithUsername
          ? t('authentication:usernameNotValid')
          : t('authentication:emailNotValid')
        setError(message)
        toast.error(message)
        return
      }
      setSubmitted(true)
      toast.success(t('general:submissionSuccessful'))
    } catch {
      const message = t('error:unknown')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AuthShell
        title={t('authentication:emailSent')}
        description={t('authentication:checkYourEmailForPasswordReset')}
        footer={
          <a
            className="underline-offset-4 hover:underline"
            href={formatAdminURL({ adminRoute, path: loginRoute })}
          >
            {t('authentication:backToLogin')}
          </a>
        }
      >
        <span />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('authentication:forgotPassword')}
      description={
        loginWithUsername
          ? t('authentication:forgotPasswordUsernameInstructions')
          : t('authentication:forgotPasswordEmailInstructions')
      }
      footer={
        <a
          className="underline-offset-4 hover:underline"
          href={formatAdminURL({ adminRoute, path: loginRoute })}
        >
          {t('authentication:backToLogin')}
        </a>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="forgot-identifier">
            {loginWithUsername
              ? t('authentication:username')
              : t('general:email')}
          </Label>
          <Input
            id="forgot-identifier"
            type={loginWithUsername ? 'text' : 'email'}
            autoComplete={loginWithUsername ? 'username' : 'email'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            disabled={loading}
            aria-invalid={error ? true : undefined}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? `${t('general:submit')}…` : t('general:submit')}
        </Button>
      </form>
    </AuthShell>
  )
}

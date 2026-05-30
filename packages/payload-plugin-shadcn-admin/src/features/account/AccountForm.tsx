'use client'

/* shadcn-styled replacement for Payload's Account view body. Account is the
   logged-in user's own record — effectively an edit form for the auth
   collection's current doc. Unlike the per-collection doc view (which excludes
   auth-synthesized fields), Account surfaces the auth-specific controls Payload
   renders here: a change-password form, the API-key panel (when
   `auth.useAPIKey`), and the email-verification state (when `auth.verify`).

   It is purpose-built rather than reusing AutoCollectionDocView so the doc view
   stays untouched. Profile fields render through the shared FieldList; each
   concern (profile / password / API key) PATCHes `/api/{userSlug}/{id}`
   independently and refreshes on success. */

import * as React from 'react'
import { useRouter } from 'next/navigation.js'
import { Check, Copy } from 'lucide-react'
import { toast, useTranslation } from '../../internal/payloadAdapter.js'

import type { ExtractedField } from 'payload-plugin-shadcn-ui'
import type { Perms } from '../doc-form/access-control/fieldPermissions.js'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import { Label } from 'payload-plugin-shadcn-ui'
import { Badge } from 'payload-plugin-shadcn-ui'
import { Checkbox } from 'payload-plugin-shadcn-ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'
import { FieldList, setByPath } from '../auth/FieldList.js'

type AccountFormProps = {
  userSlug: string
  userId: string | number
  fields: ExtractedField[]
  initialValues: Record<string, unknown>
  useAsTitleBySlug: Record<string, string | undefined>
  docPermissions?: Perms
  useAPIKey?: boolean
  verify?: boolean
  verified?: boolean
  initialApiKey?: string | null
  initialEnableAPIKey?: boolean
  /** Admin-language options for the language selector. Built from the config's
   *  supported languages by AutoAccountView; when 0–1 entries, the selector is
   *  hidden (nothing to switch between). */
  languageOptions?: { value: string; label: string }[]
}

/* Collect renderable top-level field names (flattening transparent row/
   collapsible and named tabs) so the profile PATCH ships only real keys. */
const collectTopLevelNames = (fields: ExtractedField[]): string[] => {
  const out: string[] = []
  const visit = (list: ExtractedField[]) => {
    for (const f of list) {
      if (f.type === 'row' || f.type === 'collapsible') {
        if (f.fields) visit(f.fields)
        continue
      }
      if (f.type === 'tabs') {
        for (const tab of f.tabs ?? []) {
          if (tab.name) out.push(tab.name)
          else visit(tab.fields)
        }
        continue
      }
      if (f.name) out.push(f.name)
    }
  }
  visit(fields)
  return out
}

const SYSTEM = new Set([
  'id',
  'createdAt',
  'updatedAt',
  '_status',
  'salt',
  'hash',
  'sessions',
  'loginAttempts',
  'lockUntil',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'enableAPIKey',
  'apiKey',
  'apiKeyIndex',
  '_verified',
  '_verificationToken',
])

export function AccountForm({
  userSlug,
  userId,
  fields,
  initialValues,
  useAsTitleBySlug,
  docPermissions,
  useAPIKey,
  verify,
  verified,
  initialApiKey,
  initialEnableAPIKey,
  languageOptions = [],
}: AccountFormProps) {
  const { t, i18n, switchLanguage } = useTranslation()
  const router = useRouter()
  const endpoint = `/api/${userSlug}/${userId}`

  // ── Profile ────────────────────────────────────────────────────────────
  const [values, setValues] = React.useState<Record<string, unknown>>(
    initialValues,
  )
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  )
  const [savingProfile, setSavingProfile] = React.useState(false)

  const onFieldChange = (path: string, next: unknown) => {
    setValues((prev) => setByPath(prev, path, next))
    setFieldErrors((prev) => {
      if (!(path in prev)) return prev
      const copy = { ...prev }
      delete copy[path]
      return copy
    })
  }

  const patch = async (body: Record<string, unknown>): Promise<boolean> => {
    const res = await fetch(endpoint, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as {
        message?: string
        errors?: { message?: string }[]
      }
      toast.error(json.errors?.[0]?.message ?? json.message ?? t('error:unknown'))
      return false
    }
    return true
  }

  const saveProfile = async () => {
    if (savingProfile) return
    setSavingProfile(true)
    try {
      const body: Record<string, unknown> = {}
      for (const name of collectTopLevelNames(fields)) {
        if (SYSTEM.has(name)) continue
        if (values[name] !== undefined) body[name] = values[name]
      }
      if (await patch(body)) {
        toast.success(t('general:updatedSuccessfully'))
        router.refresh()
      }
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Password ─────────────────────────────────────────────────────────────
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [pwError, setPwError] = React.useState<string | null>(null)
  const [savingPw, setSavingPw] = React.useState(false)

  const savePassword = async () => {
    if (savingPw) return
    if (!password) {
      setPwError(t('validation:required'))
      return
    }
    if (password !== confirm) {
      setPwError(t('fields:passwordsDoNotMatch'))
      return
    }
    setSavingPw(true)
    setPwError(null)
    try {
      if (await patch({ password })) {
        toast.success(t('general:updatedSuccessfully'))
        setPassword('')
        setConfirm('')
        router.refresh()
      }
    } finally {
      setSavingPw(false)
    }
  }

  // ── API key ────────────────────────────────────────────────────────────
  const [enabled, setEnabled] = React.useState(Boolean(initialEnableAPIKey))
  const [apiKey, setApiKey] = React.useState<string | null>(
    initialApiKey ?? null,
  )
  const [keyBusy, setKeyBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const toggleApiKey = async (next: boolean) => {
    if (keyBusy) return
    setKeyBusy(true)
    try {
      if (next) {
        const key = crypto.randomUUID()
        if (await patch({ enableAPIKey: true, apiKey: key })) {
          setEnabled(true)
          setApiKey(key)
          router.refresh()
        }
      } else if (await patch({ enableAPIKey: false })) {
        setEnabled(false)
        setApiKey(null)
        router.refresh()
      }
    } finally {
      setKeyBusy(false)
    }
  }

  const regenerate = async () => {
    if (keyBusy) return
    setKeyBusy(true)
    try {
      const key = crypto.randomUUID()
      if (await patch({ enableAPIKey: true, apiKey: key })) {
        setEnabled(true)
        setApiKey(key)
        router.refresh()
      }
    } finally {
      setKeyBusy(false)
    }
  }

  const copyKey = async () => {
    if (!apiKey) return
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('error:unknown'))
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t('authentication:account')}</CardTitle>
          {verify ? (
            <CardDescription>
              {verified ? (
                <Badge variant="secondary">
                  {t('authentication:verified')}
                </Badge>
              ) : (
                <Badge variant="outline">
                  {t('authentication:verify')}
                </Badge>
              )}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldList
            fields={fields}
            values={values}
            errors={fieldErrors}
            onChange={onFieldChange}
            useAsTitleBySlug={useAsTitleBySlug}
            docPermissions={docPermissions}
            disabled={savingProfile}
            operation="update"
          />
          <div className="flex justify-end">
            <Button type="button" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? `${t('general:save')}…` : t('general:save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language — admin UI language for this user. Only shown when there is
          more than one language to choose from. `switchLanguage` persists the
          choice (cookie + preference) and refreshes the admin in that language,
          the same mechanism Payload's native account view uses. */}
      {languageOptions.length > 1 && switchLanguage ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('general:language')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={i18n.language}
              onValueChange={(value) => {
                void switchLanguage?.(value as never)
              }}
            >
              <SelectTrigger id="account-language" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      ) : null}

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle>{t('authentication:changePassword')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-new-password">
              {t('authentication:newPassword')}
            </Label>
            <Input
              id="account-new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPwError(null)
              }}
              disabled={savingPw}
              aria-invalid={pwError ? true : undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-confirm-password">
              {t('authentication:confirmPassword')}
            </Label>
            <Input
              id="account-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value)
                setPwError(null)
              }}
              disabled={savingPw}
              aria-invalid={pwError ? true : undefined}
            />
          </div>
          {pwError ? (
            <p className="text-sm text-destructive">{pwError}</p>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={savePassword}
              disabled={savingPw || !password}
            >
              {savingPw
                ? `${t('authentication:changePassword')}…`
                : t('authentication:changePassword')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API key */}
      {useAPIKey ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('authentication:apiKey')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={enabled}
                disabled={keyBusy}
                onCheckedChange={(c) => void toggleApiKey(Boolean(c))}
              />
              {t('authentication:enableAPIKey')}
            </label>
            {enabled && apiKey ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="account-api-key">
                  {t('authentication:apiKey')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="account-api-key"
                    readOnly
                    value={apiKey}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copy API key"
                    onClick={copyKey}
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={regenerate}
                    disabled={keyBusy}
                  >
                    {t('authentication:generateNewAPIKey')}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

'use client'

import * as React from 'react'
import { RotateCw } from 'lucide-react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from 'payload-plugin-shadcn-ui'
import { formatAdminURL, toast, useConfig, useTranslation } from '../../internal/payloadAdapter.js'

export type RebuildFrontendButtonProps = {
  /** Consumer override label. When absent the translation key is used. */
  label?: string
  endpointPath: string
}

export function RebuildFrontendButton({
  label: labelProp,
  endpointPath,
}: RebuildFrontendButtonProps) {
  const { config } = useConfig()
  const apiRoute = (config as unknown as { routes?: { api?: string } }).routes?.api
  const serverURL = (config as unknown as { serverURL?: string }).serverURL
  const { t } = useTranslation()

  const label = labelProp ?? t('shadcnAdmin:rebuildFrontend' as Parameters<typeof t>[0])

  const [loading, setLoading] = React.useState(false)

  const handleClick = React.useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(
        formatAdminURL({ apiRoute, path: endpointPath as `/${string}`, serverURL: serverURL || '' }),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
      )
      const body = await res.json().catch(() => ({})) as Record<string, unknown>
      if (res.ok) {
        toast.success(label)
      } else {
        toast.error(
          typeof body.error === 'string' ? body.error : `Request failed (${res.status})`,
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rebuild request failed')
    } finally {
      setLoading(false)
    }
  }, [loading, apiRoute, endpointPath, serverURL, label])

  const inFlightLabel = t('shadcnAdmin:rebuilding' as Parameters<typeof t>[0])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={label}
          disabled={loading}
          onClick={handleClick}
        >
          <RotateCw className={loading ? 'animate-spin' : ''} />
          <span>{loading ? inFlightLabel : label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

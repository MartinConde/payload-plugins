import type { AdminViewServerProps } from '../../internal/payloadAdapter.js'

import { formatAdminURL } from '../../internal/payloadAdapter.js'

import { AuthShell } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'

/* RSC installed at `admin.components.views.unauthorized`. Mirrors Payload's
   `UnauthorizedView`: a 403 notice + a "log out" action. The heading reflects
   whether the user is signed in but lacks admin access vs. not signed in.
   Mounted as `payload-plugin-shadcn-admin/rsc#AutoUnauthorizedView`. */
export function AutoUnauthorizedView({ initPageResult }: AdminViewServerProps) {
  const { permissions, req } = initPageResult
  const { i18n, user, payload } = req
  const { routes: { admin: adminRoute } } = payload.config
  const logoutRoute = payload.config.admin.routes.logout

  const heading =
    user && !permissions?.canAccessAdmin
      ? i18n.t('error:unauthorizedAdmin')
      : i18n.t('error:unauthorized')

  return (
    <AuthShell
      title={heading}
      description={i18n.t('error:notAllowedToAccessPage')}
    >
      <Button asChild variant="outline" className="w-full">
        <a href={formatAdminURL({ adminRoute, path: logoutRoute })}>
          {i18n.t('authentication:logOut')}
        </a>
      </Button>
    </AuthShell>
  )
}

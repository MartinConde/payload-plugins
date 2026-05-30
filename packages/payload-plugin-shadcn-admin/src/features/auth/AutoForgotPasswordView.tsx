import type { AdminViewServerProps } from '../../internal/payloadAdapter.js'

import { formatAdminURL } from '../../internal/payloadAdapter.js'

import { AuthShell } from 'payload-plugin-shadcn-ui'
import { Button } from 'payload-plugin-shadcn-ui'
import { ForgotPasswordForm } from './ForgotPasswordForm.js'

/* RSC installed at `admin.components.views.forgot`. When a user is already
   authenticated, mirrors Payload by showing an "already logged in" notice with
   a link to the account view; otherwise mounts the shadcn forgot-password form.
   Mounted as `payload-plugin-shadcn-admin/rsc#AutoForgotPasswordView`. */
export function AutoForgotPasswordView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const { i18n, user, payload } = req
  const { routes: { admin: adminRoute } } = payload.config
  const accountRoute = payload.config.admin.routes.account

  if (user) {
    return (
      <AuthShell
        title={i18n.t('authentication:alreadyLoggedIn')}
        description={i18n.t('authentication:loggedInChangePassword')}
      >
        <Button asChild className="w-full">
          <a href={formatAdminURL({ adminRoute, path: accountRoute })}>
            {i18n.t('authentication:account')}
          </a>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <a href={adminRoute}>{i18n.t('general:backToDashboard')}</a>
        </Button>
      </AuthShell>
    )
  }

  return <ForgotPasswordForm />
}

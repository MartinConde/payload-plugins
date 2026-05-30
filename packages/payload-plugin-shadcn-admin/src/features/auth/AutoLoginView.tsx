import type { AdminViewServerProps } from '../../internal/payloadAdapter.js'

import { redirect } from 'next/navigation.js'
import { getSafeRedirect } from '../../internal/payloadAdapter.js'
import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent'

import { LoginForm } from './LoginForm.js'

/* RSC installed at `admin.components.views.login` by the `defaultAuthViews`
   plugin option. Mirrors Payload's `LoginView`: redirects away if the user is
   already authenticated, renders the optional `beforeLogin`/`afterLogin`
   server-component slots, and mounts the shadcn LoginForm.
   Mounted as `payload-plugin-shadcn-admin/rsc#AutoLoginView`. */
export function AutoLoginView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { locale, permissions, req } = initPageResult
  const { payload, user, i18n } = req
  const { config } = payload
  const {
    admin: { components: { afterLogin, beforeLogin } = {} } = {},
    routes: { admin: adminRoute },
  } = config

  if (user) {
    redirect(
      getSafeRedirect({
        fallbackTo: adminRoute,
        redirectTo: searchParams?.redirect,
      }),
    )
  }

  const serverProps = {
    i18n,
    locale,
    params,
    payload,
    permissions,
    searchParams,
    user,
  }

  return (
    <LoginForm
      afterLogin={RenderServerComponent({
        Component: afterLogin,
        importMap: payload.importMap,
        serverProps,
      })}
      beforeLogin={RenderServerComponent({
        Component: beforeLogin,
        importMap: payload.importMap,
        serverProps,
      })}
    />
  )
}

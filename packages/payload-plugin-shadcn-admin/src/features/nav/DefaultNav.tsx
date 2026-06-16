import type { ServerProps } from '../../internal/payloadAdapter.js'

import {
  DefaultAdminSidebar,
  type AdminBranding,
  type NavGroup,
} from './DefaultAdminSidebar.js'
import { NavShell } from './NavShell.js'
import {
  collectionsFromPayloadConfig,
  globalsFromPayloadConfig,
} from '../../shared/collections.js'

type PluginNavStash = {
  branding?: AdminBranding
  sidebar?: { groups: NavGroup[] }
}

type PluginNSStash = {
  nav?: PluginNavStash
  rebuildFrontend?: { label?: string; endpointPath: string }
}

/* Build a default NavGroup[] from a Payload config — one group for collections,
   one for globals. Either group is omitted when it has no items. Used as the
   fallback when the consumer doesn't pass an explicit `sidebar.groups`. */
const autoGroupsFromPayloadConfig = (
  config: ServerProps['payload']['config'],
): NavGroup[] => {
  const groups: NavGroup[] = []
  const collections = collectionsFromPayloadConfig(config)
  if (collections.length > 0) {
    groups.push({
      label: 'Collections',
      items: collections.map((c) => ({
        label: c.label,
        collectionSlug: c.slug,
      })),
    })
  }
  const globals = globalsFromPayloadConfig(config)
  if (globals.length > 0) {
    groups.push({
      label: 'Globals',
      items: globals.map((g) => ({
        label: g.label,
        globalSlug: g.slug,
      })),
    })
  }
  return groups
}

/* RSC installed at admin.components.Nav when the plugin is configured with
   `defaultNav`. Branding + sidebar tree flow from plugin options → config.custom
   (written by the plugin factory) → here, where we forward them into
   DefaultAdminSidebar.

   Consumer-defined Nav is preserved by the plugin factory (consumer wins),
   so this only renders when no other Nav is wired. */
export default function DefaultNav(props: ServerProps) {
  const ns = (
    props.payload?.config?.custom as
      | { 'plugin-shadcn-admin'?: PluginNSStash }
      | undefined
  )?.['plugin-shadcn-admin']

  const branding = ns?.nav?.branding
  const groups =
    ns?.nav?.sidebar?.groups ?? autoGroupsFromPayloadConfig(props.payload.config)
  const rebuildFrontend = ns?.rebuildFrontend

  const email = (props.user?.email as string | undefined) ?? ''
  const name = (props.user?.name as string | undefined) ?? (email || 'User')

  return (
    <NavShell>
      <DefaultAdminSidebar
        user={{ name, email }}
        branding={branding}
        groups={groups}
        rebuildFrontend={rebuildFrontend}
      />
    </NavShell>
  )
}

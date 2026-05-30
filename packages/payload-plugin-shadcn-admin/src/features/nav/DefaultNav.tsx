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
  const stash = (
    props.payload?.config?.custom as
      | { 'plugin-shadcn-admin'?: { nav?: PluginNavStash } }
      | undefined
  )?.['plugin-shadcn-admin']?.nav

  const branding = stash?.branding
  const groups =
    stash?.sidebar?.groups ?? autoGroupsFromPayloadConfig(props.payload.config)

  const email = (props.user?.email as string | undefined) ?? ''
  const name = (props.user?.name as string | undefined) ?? (email || 'User')

  return (
    <NavShell>
      <DefaultAdminSidebar
        user={{ name, email }}
        branding={branding}
        groups={groups}
      />
    </NavShell>
  )
}

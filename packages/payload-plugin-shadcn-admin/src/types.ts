import type {
  AdminBranding,
  IconRef,
  NavGroup,
  NavItem,
} from './features/nav/DefaultAdminSidebar.js'

export interface PluginConfig {
  /**
   * Disable the plugin without removing it from the config.
   */
  disabled?: boolean
  /**
   * Auto-install a shadcn-styled list view on matching collections. Consumer-defined
   * `admin.components.views.list` entries are always preserved (consumer wins).
   *
   * - `false` (default): no auto-install, fully backwards compatible.
   * - `'all'`: install on every collection that doesn't already define a list view.
   * - `string[]`: install only on the listed collection slugs.
   */
  defaultListView?: 'all' | string[] | false
  /**
   * Auto-install a shadcn-styled doc view (create + edit) at
   * `admin.components.views.edit.default` on matching collections.
   * Consumer-defined `views.edit` is always preserved (consumer wins).
   *
   * v1 supports a curated subset of field types (text, textarea, email,
   * number, date, checkbox, select, radio, non-polymorphic relationship).
   * Collections whose required fields fall outside that matrix — and upload
   * collections — are SKIPPED at config-evaluation time with a
   * `console.warn`, falling back to Payload's default view.
   *
   * - `false` (default): no auto-install, fully backwards compatible.
   * - `'all'`: install on every eligible collection that doesn't already define
   *   a views.edit slot.
   * - `string[]`: install only on the listed collection slugs.
   */
  defaultDocView?: 'all' | string[] | false
  /**
   * Auto-install a shadcn-styled doc view at
   * `admin.components.views.edit.default` on matching **globals**.
   * Consumer-defined `views.edit` is always preserved (consumer wins).
   *
   * Globals are singletons — there is no list view and no create mode; the
   * doc form always upserts via `POST /api/globals/{slug}`. When the global
   * has `versions` enabled the plugin also takes over the `versions` / `version`
   * slots; otherwise no Versions tab is shown. The same field-type eligibility
   * skip as `defaultDocView` applies (a global whose required fields fall
   * outside the supported matrix is SKIPPED with a `console.warn`, falling back
   * to Payload's default view).
   *
   * - `false` (default): no auto-install, fully backwards compatible.
   * - `'all'`: install on every eligible global that doesn't already define a
   *   views.edit slot.
   * - `string[]`: install only on the listed global slugs.
   */
  defaultGlobalView?: 'all' | string[] | false
  /**
   * Auto-install the plugin's default shadcn Nav (NavShell + DefaultAdminSidebar)
   * at `admin.components.Nav`. Consumer-defined Nav is always preserved.
   *
   * - `false` (default): no auto-install.
   * - object: install with the given branding and (optional) explicit sidebar tree.
   *   When `sidebar` is omitted, the Nav falls back to a flat auto-list of all
   *   non-hidden collections.
   */
  defaultNav?: DefaultNavConfig | false
  /**
   * Auto-install shadcn-styled replacements for Payload's root-level Account
   * and auth views at `admin.components.views.<key>`. Consumer-defined view
   * keys are always preserved (consumer wins).
   *
   * Covered keys: `account`, `login`, `createFirstUser`, `forgot`, `logout`,
   * `inactivity` (`/logout-inactivity`), `unauthorized`.
   *
   * NOT covered (not cleanly overridable in Payload 3.84.1, fall through to
   * Payload's default): the reset-password view (`/reset/:token`) and the
   * email-verify view (`/:collection/verify/:token`).
   *
   * - `false` (default): no auto-install, fully backwards compatible.
   * - `true`: install on every key the consumer hasn't already set.
   */
  defaultAuthViews?: boolean
  /**
   * Auto-install a shadcn-styled replacement for Payload's cross-collection
   * **Browse by Folder** view at `admin.components.views.browseByFolder`.
   * Resolved by the router's custom-view lookup *before* Payload's default
   * folder builder runs (the same path the `account` override uses), so it
   * fully replaces `BrowseByFolder` — no dependency on the disabled
   * `folders.components.views` slot. Requires root `folders` to be enabled.
   *
   * The per-collection folder view (`/collections/:slug/:folderSlug`) is NOT
   * router-overridable, so instead this is surfaced through the auto list view
   * via a folder/list toggle + `?view=folders` query param (it never sets
   * Payload's `listViewType` preference, which would route to Payload's
   * hardcoded folder view).
   *
   * - `false` (default): no install; Payload's default folder views render.
   * - `true`: install when the consumer hasn't set `views.browseByFolder`.
   */
  defaultFolderView?: boolean
  /**
   * Auto-install a polished, zero-config shadcn dashboard at the root `/admin`
   * landing (`admin.components.views.dashboard`). Grouped collection cards with
   * live doc counts + New/View-all links, a Globals section, and a
   * "Recently updated" strip.
   *
   * The root route is hardcoded to Payload's `DashboardView`, but that view
   * renders `views.dashboard.Component` with its own `DefaultDashboard` as the
   * fallback — so this slot replaces the landing page (it is NOT resolved via
   * the router's `getCustomViewByKey`, unlike the auth/folder overrides).
   * Grouping reuses the access-controlled `navGroups` prop Payload passes the
   * view; counts use `payload.count({ overrideAccess: false })`.
   *
   * - `false` (default): no install; Payload's default dashboard renders.
   * - `true`: install when the consumer hasn't set `views.dashboard`
   *   (consumer wins).
   */
  defaultDashboard?: boolean
}

export type DefaultNavConfig = {
  /** Sidebar header branding (name, subtitle, optional icon component, href). */
  branding?: AdminBranding
  /** Explicit sidebar tree. Pass to control grouping, ordering, icons, globals,
   *  custom links, and collapsible sub-items. */
  sidebar?: {
    groups: NavGroup[]
  }
}

export type { Crumb } from 'payload-plugin-shadcn-ui'
export type {
  AdminBranding,
  IconRef,
  IconComponent,
  NavGroup,
  NavItem,
} from './features/nav/DefaultAdminSidebar.js'

# payload-plugin-shadcn-admin

Reusable shadcn/ui-based admin chrome and server-driven DataTable for Payload CMS.

## Usage

```ts
// payload.config.ts
import { shadcnAdminPlugin } from 'payload-plugin-shadcn-admin'

export default buildConfig({
  admin: {
    components: {
      Nav: '@/admin/Nav#default', // see Nav.tsx below
    },
  },
  plugins: [shadcnAdminPlugin()],
})
```

```tsx
// src/admin/Nav.tsx
import type { ServerProps } from 'payload'
import { NavShell } from 'payload-plugin-shadcn-admin/rsc'

import { AppSidebar } from '@/components/app-sidebar'

export default function Nav(props: ServerProps) {
  const email = (props.user?.email as string | undefined) ?? ''
  return (
    <NavShell>
      <AppSidebar user={{ name: email || 'User', email }} />
    </NavShell>
  )
}
```

```css
/* src/app/(payload)/custom.css */
@source '../../../../../packages/payload-plugin-shadcn-admin/src';
/* ...your tailwind imports, .twp preflight, shadcn tokens, @theme block... */
@import 'payload-plugin-shadcn-admin/styles.css';
```

## Register order

Register `shadcnAdminPlugin` **after** any feature plugin whose collections/globals it
should auto-view (`payload-plugin-seo`, `payload-plugin-menus`, `payload-plugin-products`).
Plugins are `(config) => config` functions applied in `plugins: []` array order — this
plugin's `defaultListView`/`defaultDocView`/`defaultGlobalView` walk `config.collections`/
`config.globals` at the moment it runs, installing an auto view only where one isn't
already set. Register it first and those collections/globals simply won't exist yet to
walk.

## Options

All plugin options are optional. Pass them to `shadcnAdminPlugin({ ... })`.

| Option | Type | Default | Notes |
|---|---|---|---|
| `disabled` | `boolean` | `false` | Skip the whole plugin — config passes through untouched. |
| `defaultListView` | `'all' \| string[] \| false` | `false` | Auto-installs the shadcn list view on matching collections. A collection's own `admin.components.views.list` always wins. |
| `defaultDocView` | `'all' \| string[] \| false` | `false` | Auto-installs the shadcn create/edit doc view. Skips collections whose fields fall outside the supported field-type matrix (or unsupported upload cases), falling back to Payload's default view with a `console.warn`. Also wires `edit.versions`/`edit.version` when `collection.versions` is set, and `edit.api` unconditionally. |
| `defaultGlobalView` | `'all' \| string[] \| false` | `false` | Global-twin of `defaultDocView` — no list view or create mode, since a global is a singleton upsert. |
| `defaultNav` | `DefaultNavConfig \| false` | `false` | Installs the shadcn sidebar Nav — see below. Only takes effect if you haven't already set your own `admin.components.Nav`. |
| `defaultAuthViews` | `boolean` | `false` | Installs shadcn replacements for account/login/create-first-user/forgot-password/logout/inactivity/unauthorized — see below. |
| `defaultFolderView` | `boolean` | `false` | Installs a shadcn Browse-by-Folder view at the root (requires root `folders` enabled in your Payload config). Per-collection folder browsing is instead a List⇄Folders toggle inside the auto list view. |
| `defaultDashboard` | `boolean` | `false` | Installs a zero-config dashboard (widgets, arrangeable/resizable, persisted per-user) as the `/admin` landing page. A consumer-defined dashboard view wins. |
| `livePreview` | `LivePreviewConfig` | `{ blocksFieldName: 'layout' }` | Configures the page-builder overlay — see below. |
| `rebuildFrontend` | `RebuildFrontendConfig \| false` | `false` | Adds a "Rebuild Frontend" sidebar button that triggers a deploy hook — see below. |

### `defaultNav`

```ts
shadcnAdminPlugin({
  defaultNav: {
    branding: { name: 'CMS', subtitle: 'Payload admin', icon: 'Rocket', href: '/admin' },
    sidebar: {
      groups: [
        { label: 'Content', items: [{ label: 'Pages', collectionSlug: 'pages' }] },
      ],
    },
  },
})
```

`branding.name` is the only required field; `subtitle` defaults to `'Payload admin'`,
`icon` accepts a lucide PascalCase name string (recommended, serializable) or a
component reference, `href` defaults to `/admin`. Omitting `sidebar` falls back to a
flat auto-list of every non-hidden collection. Each `NavItem` in `sidebar.groups[].items`
takes `label` + either `href` (wins if set) or `collectionSlug`/`globalSlug`, plus a
nested `items` array to render as a collapsible group.

### `defaultAuthViews`

A single on/off flag, not a per-view object — when `true` it wires shadcn replacements
for `account`, `login`, `createFirstUser`, `forgot`, `logout`, `inactivity`, and
`unauthorized`, filling only the keys you haven't already set yourself. **Not covered**:
password-reset (`/reset/:token`) and email-verify (`/:collection/verify/:token`) —
Payload resolves those two routes before any custom-view lookup runs, so they always
fall through to Payload's stock view regardless of this option.

### `livePreview`

```ts
shadcnAdminPlugin({
  livePreview: { blocksFieldName: 'sections' }, // default: 'layout'
})
```

The page-builder overlay (resizable live-preview pane + block outline/selection) auto-
activates per collection when that collection has both `admin.livePreview` enabled and a
`blocks` field named `blocksFieldName`. There's no separate collection allowlist —
`admin.livePreview` is itself the per-collection opt-in. See `LIVE-PREVIEW.md` in the
starter repo for the full mechanism.

### `rebuildFrontend`

Show a **"Rebuild Frontend"** button in the sidebar footer that triggers a frontend
deploy server-side by POSTing to a deploy-hook URL. The deploy-hook URL is a secret
read from a server-side env var and is never sent to the browser.

> **Requires `defaultNav`** — the button lives inside the plugin's own sidebar footer,
> so `defaultNav` must be enabled.

```ts
shadcnAdminPlugin({
  defaultNav: { branding: { name: 'CMS' } },
  rebuildFrontend: {
    deployHookEnv: 'FRONTEND_DEPLOY_HOOK_URL', // default — name of the env var
    label: 'Rebuild Frontend',                 // default — button label
    endpointPath: '/rebuild-frontend',         // default — Payload API path
    access: (req) => Boolean(req.user?.roles?.includes('admin')), // custom override
  },
})
```

All sub-options are optional. `deployHookEnv`/`label`/`endpointPath` default to the
values shown above when omitted. `access` gates the endpoint beyond plain
authentication — by default it restricts the button/endpoint to users in the
admin-panel's own auth collection (`req.user?.collection === config.admin?.user`), so
e.g. a read-only frontend service user (an authenticated user of some *other*
auth-enabled collection) can't trigger a deploy. Pass your own function only if that
default is wrong for your setup, e.g. to further restrict by role.

**Required env var on the consuming app's deployment environment:**

```
FRONTEND_DEPLOY_HOOK_URL=https://api.cloudflare.com/...deploy_hooks/<secret>
```

The endpoint (`POST /api/rebuild-frontend`) is auth-gated — unauthenticated
requests return `401`. If the env var is unset the endpoint returns `500 { error:
"Deploy hook not configured" }` with the real reason logged server-side only.

> **Cloudflare Workers note:** if your CMS runs on Cloudflare Workers (e.g. via
> `@opennextjs/cloudflare`), confirm that `FRONTEND_DEPLOY_HOOK_URL` is surfaced into
> `process.env` at runtime — Workers bindings may need explicit wiring via the
> OpenNext config or `wrangler.toml` `[vars]` block.

## Exports

- `payload-plugin-shadcn-admin` — `shadcnAdminPlugin()`, `collectionsFromPayloadConfig`, `globalsFromPayloadConfig`, `galleryField()` (+ types `PluginConfig`, `Crumb`, `GalleryFieldOptions`)
- `payload-plugin-shadcn-admin/client` — vendored shadcn/ui primitives (`Button`, `Card*`, `Input`, `Label`, `Textarea`, `Select*`, `RadioGroup*`, `Checkbox`, `Table*`, `Tabs*`, `Popover*`, `Command*`, `Badge`, `Calendar`, `DropdownMenu*`, `Sidebar*`, `Collapsible*`, `Separator`); admin chrome (`AdminProviders`, `ViewShell`, `ViewHeader`, `AuthShell`, `DefaultAdminSidebar`, `NavUser`, `CollectionsSidebarGroup`, `RebuildFrontendButton`); the DataTable stack (`DataTable`, `DataTableColumnHeader`, `DataTablePagination`, `DataTableViewOptions`, `selectColumn`, `useDataTableUrlState`, `CollectionListViewClient`); filtering + presets + column persistence (`FilterBar`, `FilterChip`, `FilterChipEditor`, `FilterValueInput`, `AddFilterMenu`, `OrGroupWrapper`, `RelationshipPicker`, `PresetsMenu`, `usePresets`, `useFilterUrlState`, `usePreferencesSync`, `useColumnPrefs`, `resolveColumnOrder`); CSV export (`ExportMenu`, `FieldPickerSheet`); bulk edit (`BulkEditSheet`, `BulkEditFieldInput`, `isBulkEditable`); the versions/diff UI (`VersionsList`, `SelectComparison`, `SelectLocales`, `RestoreVersion`); and the doc-form `.input`-override surface (`FieldInput`, `SearchableSelect`, `UploadFieldInput`, `useActiveLocale`, `useDocFormFieldValue`, `useDocFormSetValue`, `useDocFormValues`, `useDocIdentity`)
- `payload-plugin-shadcn-admin/rsc` — `NavShell`, `extractCollection`, `CollectionListView`, `AutoCollectionListView`, `AutoCollectionDocView`, `AutoVersionsView`, `AutoVersionView`, `AutoApiView`, `DefaultNav`, the `defaultAuthViews` views (`AutoAccountView`, `AutoLoginView`, `AutoCreateFirstUserView`, `AutoForgotPasswordView`, `AutoLogoutView`, `AutoLogoutInactivityView`, `AutoUnauthorizedView`), `AutoBrowseByFolderView`, `AutoDashboardView`
- `payload-plugin-shadcn-admin/types` — `PluginConfig`, `Crumb`, `CollectionListViewProps`, `ExtractedCollection`, `ExtractedField`, `ExtractedTab`, `ExtractedBlock`
- `payload-plugin-shadcn-admin/styles.css` — Payload-chrome overrides
- `payload-plugin-shadcn-admin/themes.css` — optional color-flavor tokens (minimal/vibrant × light/dark), toggled by the account menu's `ThemeSwitcher` via `[data-ui-theme='vibrant']`; only needed if you want the vibrant flavor, `styles.css` alone covers the default minimal look

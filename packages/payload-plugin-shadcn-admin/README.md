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

## Options

All plugin options are optional. Pass them to `shadcnAdminPlugin({ ... })`.

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
  },
})
```

All sub-options are optional; the defaults shown above apply when the key is omitted.

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

- `payload-plugin-shadcn-admin` — `shadcnAdminPlugin()`
- `payload-plugin-shadcn-admin/client` — `AdminProviders`, `ViewShell`, `ViewHeader`, `DataTable`, `DataTableColumnHeader`, `selectColumn`, `useDataTableUrlState`, `RebuildFrontendButton`
- `payload-plugin-shadcn-admin/rsc` — `NavShell`
- `payload-plugin-shadcn-admin/types` — `PluginConfig`, `Crumb`
- `payload-plugin-shadcn-admin/styles.css` — Payload-chrome overrides

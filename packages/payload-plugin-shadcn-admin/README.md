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

## Exports

- `payload-plugin-shadcn-admin` — `shadcnAdminPlugin()`
- `payload-plugin-shadcn-admin/client` — `AdminProviders`, `ViewShell`, `ViewHeader`, `DataTable`, `DataTableColumnHeader`, `selectColumn`, `useDataTableUrlState`
- `payload-plugin-shadcn-admin/rsc` — `NavShell`
- `payload-plugin-shadcn-admin/types` — `PluginConfig`, `Crumb`
- `payload-plugin-shadcn-admin/styles.css` — Payload-chrome overrides

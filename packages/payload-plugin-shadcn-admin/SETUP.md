# Setup guide

This walks through dropping `payload-plugin-shadcn-admin` into a fresh Payload 3 + Next 15 app and getting the shadcn admin chrome rendering. Total work: ~10 minutes if you already have a Payload app running.

For a high-level overview of what the plugin handles and what's intentionally deferred, see [FEATURES.md](./FEATURES.md).

The plugin owns: sidebar, view shell, breadcrumbs header, `DataTable`, `useDataTableUrlState`, `<CollectionListView>`, `<DefaultAdminSidebar>`, the auto list view (`defaultListView`, see §7b), and the vendored shadcn primitives (Button, Card, DropdownMenu, Input, Table, etc.). Your app owns: branding, Tailwind config (one CSS file), the Payload config wiring, and per-collection list-view overrides only when you need them.

---

## 1. Install

```bash
pnpm add payload-plugin-shadcn-admin
pnpm add -D tailwindcss @tailwindcss/postcss tw-animate-css
```

Tailwind v4 is required (the plugin's classes target v4's `@theme`/`@source` model). If you're already on v4, skip the second line.

Peer deps the plugin assumes are already in your app: `payload@^3`, `next@>=15`, `react@>=19`, `@payloadcms/next`, `@payloadcms/ui`.

## 2. PostCSS

Create `postcss.config.mjs` in the Next.js app:

```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
}
```

## 3. The Tailwind CSS file

Create `src/app/(payload)/custom.css` (path can differ — match wherever your `(payload)` route group is) and paste this verbatim:

```css
@layer theme, base, components, utilities;

@import 'tailwindcss/theme.css' layer(theme);
@import 'tw-animate-css';

/* Pull the plugin's source into Tailwind v4's content scan so its utility
   classes (bg-background, flex, gap-2, etc.) end up in the compiled CSS.
   Tailwind v4 ignores node_modules by default. Adjust the relative path
   for your repo layout. In a pnpm workspace this is typically:
     ../../../../../packages/payload-plugin-shadcn-admin/src
   In a single-package app installing from npm:
     ../../../node_modules/payload-plugin-shadcn-admin/dist  */
@source '../../../../../packages/payload-plugin-shadcn-admin/src';

/* Trap Tailwind v4 preflight inside .twp so Payload's own admin chrome
   (default tables, sidebar, forms used by collections we DON'T customize)
   keeps its own resets. The plugin renders all its components inside
   wrappers that have the .twp class, so this scoping is automatic. */
@layer base {
  .twp {
    @import 'tailwindcss/preflight.css';
  }
  /* Escape hatch: any subtree marked .no-twp inside .twp reverts to host styles */
  .twp.no-twp *,
  .twp.no-twp ::after,
  .twp.no-twp ::before,
  .twp.no-twp ::backdrop,
  .twp.no-twp ::file-selector-button {
    all: revert-layer;
  }
}

@import 'tailwindcss/utilities.css' layer(utilities);

@custom-variant dark (&:is([data-theme='dark'] *));

/* shadcn/ui tokens. Dark mode is wired to Payload's [data-theme='dark']
   attribute instead of shadcn's default .dark class. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

[data-theme='dark'] {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

/* Payload chrome overrides (hide default header, restore 16px root, etc.).
   Tailwind v4's PostCSS plugin uses its own CSS resolver and doesn't
   resolve bare package specifiers, so use a relative path. */
@import '../../../../../packages/payload-plugin-shadcn-admin/src/styles.css';
```

**The two relative paths** (`@source` and the trailing `@import`) need to match your repo layout. In a pnpm workspace they point at `packages/payload-plugin-shadcn-admin/src`; in a single-package app installing from npm they point at `node_modules/payload-plugin-shadcn-admin/dist` (Tailwind needs source files, so the source-shipped layout is friendlier — see "If you can't use the source" below).

Then import `custom.css` once from your admin layout (`src/app/(payload)/layout.tsx`):

```tsx
import './custom.css'
```

## 4. Wire the Payload config

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { shadcnAdminPlugin } from 'payload-plugin-shadcn-admin'

export default buildConfig({
  admin: {
    user: 'users',
    components: {
      Nav: '@/admin/Nav#default',
      views: {
        // Optional: replace the default dashboard
        dashboard: { Component: '@/admin/views/Dashboard#default' },
      },
    },
  },
  // ... rest of your config ...
  plugins: [shadcnAdminPlugin()],
})
```

## 5. Nav component

```tsx
// src/admin/Nav.tsx
import type { ServerProps } from 'payload'
import { collectionsFromPayloadConfig } from 'payload-plugin-shadcn-admin'
import { DefaultAdminSidebar } from 'payload-plugin-shadcn-admin/client'
import { NavShell } from 'payload-plugin-shadcn-admin/rsc'

export default function Nav(props: ServerProps) {
  const email = (props.user?.email as string | undefined) ?? ''
  const collections = collectionsFromPayloadConfig(props.payload.config)
  return (
    <NavShell>
      <DefaultAdminSidebar
        user={{ name: email || 'User', email }}
        collections={collections}
        branding={{ name: 'My App', subtitle: 'Admin' }}
      />
    </NavShell>
  )
}
```

`branding` supports `{ name, subtitle?, icon? (LucideIcon), href? }`. To inject your own sidebar content (extra groups, a search box, etc.), pass `children` to `<DefaultAdminSidebar>` and it'll render inside `<SidebarContent>` after the collections list. For full control, build your own sidebar with the primitives re-exported from `payload-plugin-shadcn-admin/client` (`Sidebar`, `SidebarHeader`, `CollectionsSidebarGroup`, `NavUser`, etc.) — that's exactly what `<DefaultAdminSidebar>` does internally.

## 6. (Optional) Custom dashboard

> Prefer zero-config? Skip this and set `defaultDashboard: true` (see §6b) — the plugin ships a polished
> dashboard out of the box. Hand-roll only when you want bespoke content. If you do both, **your** custom
> dashboard wins.

```tsx
// src/admin/views/Dashboard/index.tsx
import type { AdminViewServerProps } from 'payload'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ViewShell,
} from 'payload-plugin-shadcn-admin/client'

export default function CustomDashboard(_props: AdminViewServerProps) {
  return (
    <ViewShell breadcrumbs={[{ label: 'Dashboard' }]}>
      <Card>
        <CardHeader><CardTitle>Welcome</CardTitle></CardHeader>
        <CardContent>Your admin dashboard.</CardContent>
      </Card>
    </ViewShell>
  )
}
```

## 6b. Zero-config dashboard (`defaultDashboard`) — v3.16

Opt in and the plugin installs a polished shadcn dashboard at the root `/admin` landing:

```ts
shadcnAdminPlugin({
  defaultDashboard: true,
})
```

What you get: grouped **collection cards** with live doc counts + **New** / **View all** links, a **Globals**
section, and a **Recently updated** strip. Grouping matches the sidebar Nav groups (`admin.group`).

### How it works

The root `/admin` route is special. Payload's router (`getRouteData` `case 0`) **hardcodes** the root to
Payload's own `DashboardView` — it is **not** resolved by key via `getCustomViewByKey` the way the auth and
folder overrides are. But `DashboardView` then renders `config.admin.components.views.dashboard?.Component`
with its own `DefaultDashboard` as the **fallback**:

```js
RenderServerComponent({
  Component: config.admin?.components?.views?.dashboard?.Component,
  Fallback: DefaultDashboard,
  serverProps: { ...props, navGroups, payload, permissions, visibleEntities, /* … */ },
})
```

So installing at `admin.components.views.dashboard` replaces the landing page, and a **consumer-defined
dashboard wins** automatically — the plugin only registers when you haven't set `views.dashboard` yourself
(see §6). The import-map generator iterates all `views` keys generically, so the path resolves like every
other view.

The view's data comes from the server props Payload hands the component:

- **Grouping + access control** reuse the `navGroups` prop (built by `@payloadcms/ui` `getNavGroups` →
  `groupNavItems`) — already filtered to entities the user can `read` and grouped by `admin.group`. The
  sidebar Nav has no count mechanism to reuse, so **per-collection counts** come from
  `payload.count({ overrideAccess: false })` run in parallel from the RSC entry (`AutoDashboardView`).
- **Recently updated** is capped: it samples the first ~5 readable collections that keep `timestamps`,
  `find`s each `sort: '-updatedAt' limit: 5` (access-scoped, each isolated in try/catch), merges, and shows
  the top ~8. Payload has no single-query recent-across-collections, hence the cap.

The RSC entry wraps a client `DashboardClient` in `ViewShell` with a single "Dashboard" breadcrumb (no
`.shadcn-auto-doc-view` marker — there's no doc-header to hide on the dashboard route).

## 7. Custom list view per collection

```tsx
// src/admin/views/UsersList/columns.tsx
'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  selectColumn,
} from 'payload-plugin-shadcn-admin/client'

export type UserRow = { id: number | string; email: string; createdAt: string }

export const columns: ColumnDef<UserRow>[] = [
  selectColumn<UserRow>(),
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue('email')}</span>,
  },
  // ...
]
```

```tsx
// src/admin/views/UsersList/index.tsx
import type { ListViewServerProps } from 'payload'
import { CollectionListView } from 'payload-plugin-shadcn-admin/rsc'
import { columns, type UserRow } from './columns'

export default function UsersListView(props: ListViewServerProps) {
  return (
    <CollectionListView<UserRow>
      serverProps={props}
      title="Users"
      columns={columns}
      searchPlaceholder="Search users…"
      mapRow={(doc) => ({
        id: doc.id,
        email: doc.email ?? '',
        createdAt: doc.createdAt ?? '',
      })}
    />
  )
}
```

Then point the collection at it:

```ts
// collections/Users.ts
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    components: {
      views: {
        list: { Component: '@/admin/views/UsersList#default' },
      },
    },
  },
  // ...
}
```

After adding (or moving) a custom view, regenerate the import map:

```bash
pnpm payload generate:importmap
```

`<CollectionListView>` props (all optional except `serverProps`, `title`, `columns`):

| Prop | Default | Notes |
|---|---|---|
| `mapRow?: (doc) => TData` | identity | Use when your row shape differs from the Payload doc shape. |
| `breadcrumbs?: Crumb[]` | `[{ label: title }]` | |
| `enableSearch?` | auto (on if collection has `admin.useAsTitle` or `admin.listSearchableFields`) | |
| `searchPlaceholder?` | `"Search…"` | |
| `enableBulkDelete?` | `hasDeletePermission` from the server props | |
| `enableCreate?` | `hasCreatePermission` from the server props | |
| `enableSorting? / enableFiltering? / enableColumnVisibility?` | `true` | |
| `filterColumnId? / filterPlaceholder?` | off | Per-column toolbar `contains` filter. |
| `toolbarRight? / bulkActions?` | sensible defaults | Replace defaults. Must originate from a `'use client'` module. |
| `onRowClick?` | `router.push('/admin/collections/<slug>/<id>')` | Override. |
| `disableRowClick?` | `false` | Skip the click handler entirely. |

## 7b. Zero-config auto list view (`defaultListView`)

Opt-in plugin option that auto-installs a shadcn list view on every (or selected) collection without per-collection code:

```ts
plugins: [
  shadcnAdminPlugin({ defaultListView: 'all' }),        // every collection
  // or: shadcnAdminPlugin({ defaultListView: ['media', 'posts'] })
  // default: false (no behavior change)
]
```

For each matching collection that doesn't already define `admin.components.views.list`, the plugin installs `AutoCollectionListView` — an RSC that reads the collection's field config, builds `ColumnDef`s, and renders `<CollectionListView>`. Any collection with a consumer-defined list view is left alone (consumer wins).

**Column picking.** Uses `collection.admin.defaultColumns` if set; otherwise `[useAsTitle, ...first few top-level non-hidden fields]` and appends `createdAt` / `updatedAt`.

**Field-type coverage.** `id`, `text`, `textarea`, `email`, `number`, `date` (+ `createdAt`/`updatedAt`), `checkbox`, `select` (single + multi), `radio`, `upload`, `code`, `json` (truncated), plus:

- `richText` — 60-char plain-text preview (walks Lexical AST or Slate-style nodes).
- `array` — `{N} {singular|plural}` if `field.labels` is set, else `{N} item(s)`.
- `blocks` — `{N} blocks (slug, slug, …)` using unique `blockType` values.
- `group` / `tab` / `tabs` — prefers a `title` / `name` / `label` subfield; otherwise the first scalar subfield value.
- `point` — `lat, lng` to 4 decimals (storage is `[lng, lat]`; display swaps for human-readable lat-first).
- `relationship` — non-polymorphic shows `useAsTitle` (+ `+N more` when `hasMany`); polymorphic shows a small `relationTo` type badge plus the related doc's `useAsTitle`.

Any field type not in this list falls back to `<em>{fieldType}</em>` so it's visible at a glance.

**Relationships render `useAsTitle`.** When a picked column is a relationship/upload, the auto view re-fetches the list with `depth: 1` so cells can render the related doc's title. One extra DB read per page render on those collections — acceptable for admin list pages. The refetch is projected: a `select` (built from the same `pickFieldNames` logic that drives the columns) limits the parent doc to the rendered columns, and a slug-keyed `populate` trims each related doc to just its `useAsTitle` (`select` can't reach into populated docs). It also passes the active `locale` (`serverProps.locale.code`) so localized cells render the current locale, not the default.

**Customizing without writing a full list view.** Two Payload-native knobs:

- `admin.defaultColumns` on the collection — controls *which* fields show, and in what order.
- A per-field cell override via `field.custom['plugin-shadcn-admin'].cell` — replaces the cell renderer for one field (see caveat below).
- A Payload-native `field.admin.components.Cell` — honored as of v3.20 (resolved through the import map; see "Native `field.admin.components.Cell` interop" below).

For full control (custom toolbar, bulk actions, row click, etc.), define `admin.components.views.list` yourself; the plugin's auto-install skips that collection.

### Per-field cell override (verified)

The auto-columns builder honors a plugin-namespaced escape hatch on any field:

```ts
// In your field config:
{
  name: 'status',
  type: 'select',
  options: ['draft', 'published'],
  custom: {
    'plugin-shadcn-admin': {
      // Must be a function defined in a 'use client' module
      // (see caveat below). ColumnDef<TData>['cell'] signature.
      cell: StatusBadgeCell,
    },
  },
}
```

**Constraint:** the cell function you put in `custom['plugin-shadcn-admin'].cell` must be a **client reference** — i.e., defined in (or exported from) a `'use client'` module in your consumer app's source. A function declared inline in `payload.config.ts` will fail to cross the RSC→Client boundary at serialization time with a "Functions cannot be passed directly to Client Components" error.

Verified working in this repo with `apps/cms/src/admin/cells/AltCell.tsx` wired on `Media.alt`. See that file for the canonical pattern.

> **`field.custom` serialization contract.** Only the `custom['plugin-shadcn-admin']` namespace crosses the RSC→Client boundary (`extractField` carries it and nothing else). A non-serializable value under a *foreign* namespace — another plugin's function, a `Date`, a class instance — no longer reaches the boundary, so it can't break list/doc render. Put any cell/input override under the plugin namespace, as the `.cell` / `.input` examples show.

The intended pattern:

```tsx
// src/admin/cells/StatusBadgeCell.tsx
'use client'
import type { CellContext } from '@tanstack/react-table'

export const StatusBadgeCell = ({ getValue }: CellContext<any, unknown>) => {
  const value = String(getValue() ?? '')
  return <span data-status={value}>{value}</span>
}
```

```ts
// collections/Posts.ts
import { StatusBadgeCell } from '../admin/cells/StatusBadgeCell'

export const Posts: CollectionConfig = {
  // ...
  fields: [
    {
      name: 'status',
      type: 'select',
      options: ['draft', 'published'],
      custom: { 'plugin-shadcn-admin': { cell: StatusBadgeCell } },
    },
  ],
}
```

**Why this works when icon components don't:** consumer-source files marked `'use client'` are processed by Next.js's bundler and turned into client references, so a function exported from `apps/cms/src/admin/cells/AltCell.tsx` survives the boundary cleanly. Components imported from `node_modules` packages with `'use client'` (like lucide-react) DO NOT — when loaded by the unbundled `payload.config.ts`, they resolve to raw `forwardRef` objects without the client-reference wrapping, hence the icon API requires string names instead. The asymmetry is real and tied to where the `'use client'` module physically sits relative to the Next.js bundler.

### Native `field.admin.components.Cell` interop (v3.20)

Consumers who already wired a Payload-native `Cell` for the stock list view get it honored too — no need to re-author it as a `.cell` escape hatch. `field.admin.components.Cell` (a `PayloadComponent` path ref) resolves through Payload's import map.

**How it works.** Rather than adapt `CellComponentProps` → TanStack `CellContext` by hand (the shapes differ), the RSC list view (`renderNativeCells`) pre-renders each native Cell **server-side** via Payload's own `RenderServerComponent` — the exact call site `@payloadcms/ui`'s `renderCell` uses — passing the canonical `DefaultCell{,Server}ComponentProps` (`cellData`, `rowData`, `field`, `collectionConfig`, `payload`, `i18n`). The rendered nodes are threaded to the client column builder as `{ [rowId]: { [fieldName]: node } }`; the TanStack cell does a single lookup. This means **both client and server Cells resolve** (e.g. a richText editor's server Cell), and the props always match Payload's contract.

**Resolution order:** `custom['plugin-shadcn-admin'].cell` (plugin escape hatch, client-ref) → `field.admin.components.Cell` (native, this batch) → built-in `renderCellForField`. The escape hatch still wins.

**Limitation.** A native Cell that calls Payload's list-view client hooks (`useTableCell` / `useListQuery` / `useListInfo`) will throw at hydration — those need providers we don't mount, and recreating Payload's `ListProvider` tree is a separate, much larger lift. Such Cells should use the `.cell` escape hatch instead (it runs in our table's context). This is a hydration-time concern, independent of the server-pre-render mechanism.

Verified in this repo with `apps/cms/src/admin/cells/NativeStatusCell.tsx` wired natively on `KitchenSink.priority` (renders a green `[native]` badge), alongside the `.cell`-hatch `AltCell` on `Media.alt`.

> **Drawer creates — attempted (v3.21) then removed.** A list-view "create in a `Sheet`" flow was built and reverted: mounting `AutoDocFormBridge` outside Payload's real document/Form context left the lifted Lexical editors read-only (and the bridge's dirty-state never engaged, disabling Discard), so required richText couldn't be filled. Reproducing that context off the list page is a much larger lift than the feature warranted. **Create navigates to the dedicated `/create` route** — the canonical, fully-working path.

### Group by (v3.22)

A "Group by" picker in the list header groups rows by a chosen field, mirroring Payload's native group-by. URL-param state (`?groupBy=<field>`, `-field` for descending group order); selecting **None** clears it.

**How it works.** The RSC (`getGroupedData`) does **one capped `payload.find`** (filter + search + locale applied, `depth: 1`, sorted by the groupBy field) and groups the returned docs **in JS**. (An earlier cut used `payload.findDistinct` to mirror `@payloadcms/next`'s `handleGroupBy`, but that operation isn't implemented by every adapter — `@payloadcms/db-d1-sqlite` throws `payload.db.findDistinct is not a function` — so the single-find approach is both adapter-agnostic and one query.) The client `GroupedListView` renders one barebones TanStack table per group (core row model only — no per-group toolbar/pagination), reusing the exact auto column defs (including v3.20 native cells, looked up by rowId across all groups). Row click navigates to the doc, same as the flat list.

**Groupable fields.** Single-value `text` / `email` / `number` / `date` / `checkbox` / `radio` / `select` / `relationship` (relationship headings resolve the related doc's `useAsTitle`). `hasMany` and structural / rich types are excluded.

**Heading + null group.** Headings format by type (relationship title, locale-formatted date, True/False, else the value). Docs with no value for the field render in a dedicated **"No value"** group (`general:noValue`), so they never vanish.

**Constraints (v1).**
- **Fetch cap:** at most `GROUP_FETCH_CAP` (500) docs are pulled for grouping in the single find; when the collection has more, a "capped sample" note appears — narrow with a filter for the full picture.
- **Group cap:** at most `GROUP_CAP` (50) groups render (extra groups dropped from the tail); high-cardinality fields would otherwise be a wall of sparse tables.
- **No per-group pagination:** counts and rows are within the fetched window.
- **Filter + search:** the filter-chip `where`, `search`, and active `locale` all thread into the one find.
- Not available in trash mode (the bin stays a flat list).

### Filter chip bar

The auto list view ships a chip-style filter bar above the table for building multi-field, multi-operator queries without hand-crafting `where[...]` URL keys.

**Composition.** Chips render flat (implicit AND) by default. Each chip's popover has a "Switch to OR / AND" toggle that controls how that chip joins the previous one — adjacent OR-joined chips share a tinted background and an `or` separator. There is no group-level NOT (Payload's `Where` doesn't model one); negation is per-chip via the `not_equals` / `not_in` operators.

**Operator matrix (v1).**

| Field type                     | Operators                                              |
|--------------------------------|--------------------------------------------------------|
| `text` / `email` / `textarea`  | `contains`, `equals`, `not_equals`                     |
| `number`                       | `equals`, `not_equals`, `greater_than`, `less_than`    |
| `date` / `createdAt` / `updatedAt` | `greater_than` (after), `less_than` (before), `equals` |
| `checkbox`                     | `equals`                                               |
| `select` / `radio`             | `equals`, `not_equals`, `in`                           |
| `relationship` (non-polymorphic) | `equals`, `in`, `exists`                             |
| `id`                           | `equals`, `in`                                         |

`richText`, `array`, `blocks`, `group`, `tab`, `point`, `code`, `json`, `upload`, and polymorphic relationships are not filterable in v1.

**Relationship picker.** Async autocomplete: as you type, the chip editor queries `GET /api/{relatedSlug}?where[{useAsTitle}][like]=…&limit=10&depth=0` and shows matching docs. Falls back to a plain ID input when the related collection has no `useAsTitle`.

**URL shape.** Filters live in the URL via Payload's standard flat `where[field][op]=value` keys. When any OR group is present, the bar switches to the indexed shape (`where[and][0][field][op]=…`, `where[and][1][or][0][field][op]=…`) — both are parsed back into the nested object Payload's `Where` validator expects.

**Persistence.** The URL is authoritative. Filter state is *also* mirrored to Payload's `payload-preferences` collection (key: `collection-list-filters-{slug}`) as a write-behind cache (800 ms debounce, flushed on tab hide, unload, and FilterBar unmount). A fresh tab with no `where[*]` URL keys hydrates from prefs and immediately mirrors the result back into the URL via `router.replace` (no history entry), so copy-paste sharing always works.

We talk to the `payload-preferences` collection via the *standard collection REST endpoints* (find → create or PATCH by id) rather than the dedicated `POST /api/payload-preferences/:key` upsert route. The dedicated route routes through `payload.db.upsert`, which `@payloadcms/db-d1-sqlite` aliases to `updateOne` without passing `options.upsert: true` — the first write for any new key silently no-ops while the server responds 200 "Updated successfully". This affects all Payload prefs in D1 dev mode (nav state, column visibility, etc.), not just our filter chips. The collection REST path is the workaround.

**Out of scope (planned follow-ups):** polymorphic relationship filters, drag-and-drop reordering, nesting beyond two levels (deeper trees parse correctly but render read-only).

### Filter presets

Named snapshots of the current filter URL state, scoped per collection. After building a useful combination of where chips, sort, and search, a user can click **Save preset**, name it, and reload it later with one click.

**Captured.** Every `where[*]` URL key (so both the where-builder's indexed `where[and][…]` shape *and* any per-column `where[field][op]` flat shape are preserved), plus `sort` and `search`. `page` is reset to 1 on load; `limit` is left alone — it's a viewing preference, not a filter.

**Persistence.** Same backing store as filter chip persistence: the `payload-preferences` collection, under the key `collection-list-presets-{slug}`. Storage shape is `{ schemaVersion: 1, presets: Preset[] }`. Each preset records `{ id, name, createdAt, where, sort, search }` where `where` is an array of raw URL `[key, value]` tuples so multi-value keys round-trip correctly. Reads/writes go through the standard collection REST endpoints for the same d1-sqlite-upsert reason described above.

**Limit.** 20 presets per collection. The Save button shows an inline "delete one to save another" message when the limit is hit. Saving with an existing name flips the popover into a "Replace existing?" confirmation rather than creating a duplicate.

**Where it renders.** Auto-mounted inside `<FilterBar>` next to the **Add filter** pill — no extra wiring required for the default list view. Consumers mounting `<FilterBar>` themselves still get it for free.

**Composing your own.** The component and hook are exported for custom integrations:

```tsx
'use client'
import { PresetsMenu, usePresets } from 'payload-plugin-shadcn-admin/client'

<PresetsMenu collectionSlug="posts" />

// or roll your own UI on top of the hook:
const { presets, savePreset, loadPreset, deletePreset } = usePresets('posts')
```

### Column reorder + visibility persistence

Users can drag a column header left or right to change its position, hide columns from the **View** dropdown, or click **Reset columns** at the bottom of that dropdown to wipe both back to the auto defaults. Order and visibility persist per collection across reloads and tabs.

**Drag UX.** A small grip icon at the start of each column header is the drag handle — the label and sort dropdown stay fully clickable. Drag-and-drop uses `@dnd-kit/core` + `@dnd-kit/sortable`. Keyboard reorder is supported: focus a grip handle, press `Space` to pick up, arrow keys to move, `Space` to drop.

**Locked columns.** The `select` checkbox column (rendered when bulk-delete is on) is locked to position 0 — not draggable, not in the persisted `order`. Any column id passed via `lockedColumnIds` on `<DataTable>` gets the same treatment.

**Persistence.** Same backing store as filter chips and presets: the `payload-preferences` collection, key `collection-list-columns-{slug}`. Storage shape:

```ts
{ schemaVersion: 1, order: string[], visibility: Record<string, boolean> }
```

The persisted `order` is the array of *user-orderable* `column.id`s only — locked columns are not stored. Writes are debounced 800 ms and flushed on tab hide / unload / unmount. We talk to the standard collection REST endpoints for the same d1-sqlite-upsert reason described above.

**Conflict resolution.** If a persisted column id no longer exists in the collection (renamed or removed field), it's silently dropped on the next render. Any auto column id not in the persisted order is appended at the end. No errors, no migration step.

**Reset.** `Reset columns` deletes the preference doc and reverts state to the auto-picked order + default visibility. After reset, the hook waits for a fresh user interaction before persisting again, so the auto order doesn't immediately get re-saved as a "fresh preference."

**Composing your own.** The hook is exported for custom list views:

```tsx
'use client'
import {
  useColumnPrefs,
  resolveColumnOrder,
  DataTable,
} from 'payload-plugin-shadcn-admin/client'

const prefs = useColumnPrefs('posts')
const autoIds = columns.map((c) => c.id ?? c.accessorKey).filter(Boolean) as string[]
const effective = resolveColumnOrder(autoIds, prefs.order, new Set(['select']))

<DataTable
  columns={columns}
  columnOrder={effective}
  onColumnOrderChange={(next) => prefs.setOrder(next.filter((id) => id !== 'select'))}
  columnVisibility={prefs.visibility}
  onColumnVisibilityChange={prefs.setVisibility}
  onResetColumns={prefs.reset}
  enableColumnReorder
  enableColumnVisibility
  // …
/>
```

### Bulk edit

When `enableBulkDelete` is on (the default for users with delete permission) and the consumer hasn't supplied their own `bulkActions`, the bulk-action bar shows an **Edit selected** button alongside **Delete selected**. Clicking it opens a right-side `Sheet`.

#### How it works (v3.17)

**Field-picker UX.** Rather than rendering every field at once, the drawer is a picker: an **Add field** menu (searchable `Command` + `Popover`) lists every bulk-editable field; the user adds one or more, fills them in, and the picked set is exactly what gets written. **Remove** drops a field from the set. This keeps the drawer light even when a richText/array/blocks editor is in play (nothing mounts until you pick it).

**Two-step flow.** Step 1 is the picker + the chosen fields' inputs. Step 2 is a "Review changes" screen listing each picked field and the value it will be set to, to confirm before the PATCH fires.

**Full field-type coverage — reuses the doc form's renderers.** Every input is rendered by the doc form's own `makeFieldTreeRenderer` (the same `renderField` / `renderChild` recursion + `.input` override resolver the edit view uses) — there is no second field-editor matrix. Coverage:

| Field type | How it's set |
|---|---|
| `text`, `textarea`, `email`, `number`, `date`, `checkbox`, `select`, `radio` | the doc form's own leaf inputs |
| `point`, `code`, `json` | the doc form's `PointInput` / `CodeInput` / `JsonInput` |
| `relationship` (single, `hasMany`, **polymorphic**) | the doc form's relationship pickers |
| `upload` (incl. `hasMany` / polymorphic) | the doc form's `UploadFieldInput` — pick an existing media doc **or** click **Upload new** to upload a file; either way the field's value is a media **id**, so the bulk PATCH stays plain JSON (a new file is uploaded **once** into the media collection, then its id is set on every selected row — no per-row multipart) |
| `array`, `blocks` | the full repeating-row editor; the **whole** array/blocks value is set on each row (Payload replaces these containers wholesale) |
| `richText` (Lexical) | a standalone editor — see below |
| leaves inside `group` / `tabs` / `row` / `collapsible` | the picker **flattens** containers and offers each inner leaf (labelled e.g. *Group › Subfield*); the PATCH body nests them (`{ group: { subfield } }`) |

**Standalone richText.** A list view has no per-doc RSC form state, so when a richText (or richText-bearing array/blocks) field is picked the drawer fetches the pre-rendered Payload `<RichTextField/>` element via a `getFormState` call scoped to the picked field path and the active locale — the same `useServerFunctions()` seam the doc-form bridge uses to rebuild richText on a locale switch (`renderAllFields: true`, `docPermissions` synthesized allow-all). The element is mounted in the same `RichTextInput` shim the doc form uses. Editors refetch when the picked-richText set or the locale changes, never per keystroke.

**Localization.** Localized leaves are edited per the active locale; on apply the shim is projected to the active locale and the batch PATCH is scoped with `?locale=<active>` (mirrors the doc form and trash-restore), so required localized fields in *other* locales don't fail validation.

> **Per-leaf group editing & non-relational adapters.** On a relational adapter (Postgres, SQLite/D1 — this starter) a partial group PATCH (`{ group: { onlyThisLeaf } }`) updates only that column, so the group's other per-doc leaves are preserved. On **MongoDB** a `$set` of a subdocument replaces the whole group object — bulk-setting one leaf inside a group there would drop its sibling leaves on the patched docs. This is a known limitation of per-leaf group bulk edits on Mongo; the relational adapters this starter targets are unaffected.

**Skip rules.** `id`, `createdAt`, `updatedAt`, `_status`, and Payload's auth-internal fields are never offered. Any field failing the doc form's renderability check (`admin.hidden`, the `hideInDocForm` custom flag, unsupported type) is excluded too.

**Opt-out flag.** Set `admin.disableBulkEdit: true` on a field to keep it out of the picker while leaving it visible elsewhere:

```ts
{
  name: 'apiKey',
  type: 'text',
  admin: { disableBulkEdit: true },
}
```

**Transport.** The drawer fires a single `PATCH /api/{slug}?where[id][in][]=…&where[id][in][]=…&locale=<active>` with a JSON body built from the picked paths (`buildPatchBody` merges sibling leaves under a shared container into one nested object). The Payload PATCH endpoint enforces row-level access control and runs the collection's `beforeChange` / `afterChange` hooks per document — server-side access enforcement is authoritative.

**Errors.** A non-2xx response leaves the drawer open on the review step and renders the server's error message inline so the user can adjust and retry. On success the drawer closes, the row selection is cleared, and the table is refreshed via `router.refresh()`.

**Composing your own trigger.** Consumers using `<CollectionListView>` directly can import the sheet and field input from `payload-plugin-shadcn-admin/client`:

```tsx
'use client'
import { BulkEditSheet } from 'payload-plugin-shadcn-admin/client'

<BulkEditSheet
  collectionSlug="posts"
  collection={postsMeta}
  selectedIds={selectedIds}
  useAsTitleBySlug={useAsTitleBySlug}
  open={open}
  onOpenChange={setOpen}
  onSuccess={() => {
    setOpen(false)
    router.refresh()
  }}
/>
```

**Custom integration.** Consumers using `<CollectionListView>` directly (not via `defaultListView`) can mount the same chip bar via the new `filterBar` slot:

```tsx
// src/admin/views/PostsList.tsx
'use client'
import { FilterBar } from 'payload-plugin-shadcn-admin/client'

// inside a 'use client' wrapper around <CollectionListView>:
<CollectionListView
  // ...
  filterBar={<FilterBar collection={postsMeta} />}
/>
```

`FilterBar`, `FilterChip`, `FilterChipEditor`, `FilterValueInput`, `AddFilterMenu`, `RelationshipPicker`, `OrGroupWrapper`, `useFilterUrlState`, and `usePreferencesSync` are all exported from `payload-plugin-shadcn-admin/client`. The vendored `Popover`, `Command`, `Badge`, and `Calendar` primitives are exported from the same module.

### CSV export

The auto list view ships an **Export ▾** dropdown in the toolbar, next to the View options trigger. It hits Payload's REST API from the browser, serializes the result to CSV, and triggers a download via a hidden `<a download>` — no server-side jobs, no extra plugin, no peer dep. Works on Cloudflare Workers and any other Payload host.

**Scopes.** Three menu items:

- **Export selected** — only the rows currently ticked. Disabled when no rows are selected.
- **Export filtered** — clones the current `where[…][…]`, `search`, and `sort` URL params (so the CSV matches what's on screen) but ignores pagination — every matching row is fetched.
- **Export all** — every row in the collection, no filter applied.

Each item opens a right-side `Sheet` (the field-picker) with a checkbox list of fields. Default-checked = the columns currently visible in the table, in the user's drag-reorder order. Hit Export and the CSV starts downloading.

**Complex fields.** Scalars (text/number/date/boolean) render plainly. Everything else (`richText`, `array`, `blocks`, `group`, `point`, polymorphic relationships, and any populated object) is `JSON.stringify`'d into a single cell. Single relationships export as the related document's id (the fetch uses `depth=0`).

**Paging.** Filtered/all scopes paginate `/api/{slug}` in pages of 500. The picker footer shows a live `Exported X / Y rows…` counter. There is a soft cap at 50 000 rows — if you cross it you'll get a confirm prompt before the loop continues. Closing the sheet mid-export cancels it.

**Opt-out.** Pass `enableExport={false}` to `<CollectionListView>` (or use the auto view's same prop) to hide the menu.

**Composing your own trigger.** Consumers using `<CollectionListView>` directly can import the menu from `payload-plugin-shadcn-admin/client`:

```tsx
'use client'
import { ExportMenu } from 'payload-plugin-shadcn-admin/client'

// inside the DataTable's render-prop:
<ExportMenu table={table} collectionSlug="posts" fields={postsMeta.fields} />
```

`ExportMenu`, `FieldPickerSheet`, and the `ExportScope` / `ExportFieldChoice` types are exported from `payload-plugin-shadcn-admin/client`.

## 7b.5. Zero-config auto doc view (`defaultDocView`)

Opt-in plugin option that auto-installs a shadcn-styled doc form (create + edit) on every (or selected) collection without per-collection code:

```ts
plugins: [
  shadcnAdminPlugin({
    defaultDocView: 'all',                 // every eligible collection
    // or: shadcnAdminPlugin({ defaultDocView: ['posts', 'tags'] })
    // default: false (no behavior change)
  }),
]
```

For each matching collection that doesn't already define `admin.components.views.edit`, the plugin installs `AutoCollectionDocView` at the `edit.default` slot — the SAME slot Payload uses for both create and edit. The doc form handles both modes from the same code path (POST on create, PATCH on edit), with dirty tracking and a `beforeunload` guard.

Any collection with a consumer-defined `views.edit` is left alone (consumer wins).

### Field-type coverage (v3.8)

| Type | Status |
|---|---|
| `text`, `textarea`, `email`, `number`, `date`, `checkbox` | ✓ supported |
| `select` (single + multi via `hasMany`), `radio` | ✓ supported |
| `relationship` (non-polymorphic, `hasMany` via async autocomplete) | ✓ supported |
| `relationship` (polymorphic, single + `hasMany`) | ✓ supported (v2) |
| `point`, `code`, `json` | ✓ supported (v2) |
| `array`, `blocks` (Card-per-row, drag-to-reorder via dnd-kit, recursive subfield rendering) | ✓ supported (v2) |
| `richText` (top level, group, tabs, inside array rows, inside blocks rows) | ✓ supported (v3) — renders with Payload's default Lexical editor via the pre-built `customComponents.Field` element lifted from `serverProps.formState` |
| `upload` (field-level, single + `hasMany`, non-polymorphic) | ✓ supported (v3.5) — thumbnail picker over `RelationshipPicker` with an "Upload new" affordance that drives Payload's `BulkUploadProvider` drawer |
| `upload` (field-level, polymorphic — `relationTo: string[]`) | ✓ supported (v3.6) — slug switcher above the picker; persists `{ relationTo, value }` (or an array of envelopes when `hasMany`), same shape as polymorphic relationship |
| Collection-level `upload: { ... }` (e.g. Media) | ✓ supported (v3.5) — custom shadcn dropzone above the field list, multipart submit on create / file replace. Client-side direct-to-bucket upload (v3.23) is wired but disabled — broken in `@payloadcms/storage-r2@3.84.1` (see §7b.5 note) |
| `versions: { drafts: { autosave } }` (drafts UI, status bar, autosave, version history, restore) | ✓ supported (v3.6) — Save-draft / Publish split, debounced autosave PATCH; full versions workflow (list + diff + compare + restore) shipped v3.9, see §7b.6 |
| Field-level `access.read` / `access.update` / `access.create` | ✓ supported (v3.7 read/update; v3.18 create) — read-denied fields render `null`; write-denied fields (update on edit forms, create on create forms) render disabled with a `Lock` icon next to the label; array/blocks Add/Remove/reorder controls grey out when the field is write-denied for the current operation; structural containers (row/collapsible/group/tabs) hide entirely when every child is read-denied |
| Localization (`localized: true` per field; `localization: { locales }` in payload config) | ✓ supported (v3.8) — locale switcher in header, per-locale dirty/values partitioning, locale-scoped `?locale=` on submit, per-switch richText rebuild via `getFormState({locale})`, optional `[Publish all locales]` when `versions.drafts.localizeStatus: true` |
| `row`, `collapsible`, `group`, `tabs` (named + unnamed) | ✓ supported (structural) |

The bulk-edit matrix (`src/components/bulk/BulkEditFieldInput.tsx`) is intentionally narrower than the doc form — it still only handles the v1 scalar subset. The v2 leaf types (point/code/json/array/blocks/polymorphic relationship) and v3 leaf type (richText) render in the doc form via the same `FieldInput` switch, but `isBulkEditable` keeps them off the bulk-edit sheet.

#### richText: how it works

richText rendering reuses Payload's own editor end-to-end:

- **Initial mount.** Payload's `DocumentView` (which wraps our `AutoCollectionDocView`) runs `renderField` for every field at server-render time. For richText fields, that stores a `<RichTextField/>` element — fully resolved with `clientFeatures`, `featureClientImportMap`, `featureClientSchemaMap`, `initialLexicalFormState`, and `lexicalEditorConfig` — at `formState[path].customComponents.Field`. We lift those elements out of `serverProps.formState`, pass them through RSC→Client serialization, and mount each inside a small `<Form el='div' isDocumentForm={false}>` + `<OperationProvider>` shim. The Form's state syncs back to our bridge via an `onChange` listener that reads `formState[path].value`.

- **Row mutations in array/blocks.** When the user adds, removes, or reorders a row that contains richText subfields, the bridge calls `useServerFunctions().getFormState(...)` (the same server function Payload's own admin uses) to rebuild form state. The response includes fresh `customComponents.Field` elements which replace entries in the bridge's `richTextRendered` state map. For remove/reorder the bridge locally re-keys existing entries by row id so users see no flicker; for added rows a short shimmer placeholder shows for the ~100–300ms the rebuild is in flight.

- **Required-empty validation is server-driven.** Lexical's empty representation is not `null` — it's an empty-paragraph node — so the bridge's `isEmpty` cannot reliably detect it client-side without duplicating editor-adapter logic. When the user submits an empty required richText, Payload returns `validation:required`, the bridge's error parser keys it to the field path, and the user sees the inline error one round-trip later.

- **Per-field `.input` override still applies.** A consumer who wants a different editor (e.g. a custom TipTap-based component) can wire one via `field.custom['plugin-shadcn-admin'].input`; the override resolver at the top of `FieldInput` runs before the richText case and short-circuits the built-in Form shim. The override is responsible for emitting a value compatible with the field's editor adapter (e.g. `SerializedEditorState` for Lexical) — Payload's server-side richText validation will reject any other shape.

- **Dep:** `@payloadcms/richtext-lexical` is declared as an optional `peerDependency` (via `peerDependenciesMeta`). The plugin doesn't import from it directly — we only consume the pre-rendered React element through `formState`. The optional peer entry is for discoverability; consumers whose schemas use richText already pull the adapter in transitively.

#### upload (v3.5): how it works

Unlike `richText`, Payload does **not** pre-render an Upload UI into `serverProps.formState` — `collection.upload` is a collection-level config flag, not a field type, and `@payloadcms/ui/dist/forms/fieldSchemasToFormState/renderField.js` has no upload branch. So the doc form renders its own picker rather than lifting one.

- **Collection-level upload (`upload: { ... }`).** When the bridge sees `collection.upload`, it renders `CollectionUploadHeader` above the field list. The header owns a custom shadcn dropzone (`DropzoneInput`) with click-to-pick and drag-and-drop, validates against `upload.mimeTypes` and `upload.maxFileSize` client-side, and previews the selected file (or the saved doc's `url`/`thumbnailURL` in edit mode).

- **Multipart vs JSON branch.** The submit path branches on `isUploadCollection && pendingFile !== null`:
  - With a file: builds `FormData` with `_payload` (JSON-stringified doc data) and `file` (the binary), POSTs/PATCHes without setting `Content-Type` so `fetch` adds the multipart boundary. This is the exact wire shape Payload's default form sends (`payload/dist/utilities/addDataAndFileToRequest.js` parses `req.data` from `_payload` and `req.file` from `file`).
  - Without a file in edit mode (metadata-only): plain JSON PATCH. Payload only invokes the multipart parser when `Content-Type` is `multipart/*`.

- **Create is hard-gated on a file.** Submitting an upload-collection create without picking a file surfaces a banner error and short-circuits — POSTing without a file would fail server-side with a less obvious error.

- **Crop / focal-point editor.** When `collection.upload.crop` or `focalPoint` is `true`, an Edit button on the preview opens Payload's own `<EditUpload/>` (from `@payloadcms/ui`, self-contained — no provider deps) inside a shadcn `Dialog`. Returned `UploadEdits` (`crop` and/or `focalPoint`) merge into the doc body on submit (Payload accepts these as regular doc fields on both POST and PATCH for upload collections).

- **Multi-file drop on create.** Dropping >1 file on the create view dispatches via `onMultiDrop`, which configures Payload's `BulkUploadProvider` (collection slug, success callback that navigates to the list view) and opens its drawer. The drawer is rendered automatically by `BulkUploadProvider`; the header just wraps itself in a provider scope. Single-file picks fill the current create form as usual. Edit mode disables multi-drop.

- **Field-level `type: 'upload'`.** Just a thumbnail-aware wrapper over the existing `RelationshipPicker`: selecting an existing upload doc stores its ID (or array of IDs for `hasMany`); thumbnails for the selected IDs are fetched via `GET /api/{relationTo}?where[id][in][]=...&depth=0` and rendered next to the filename. An "Upload new" button opens a per-field `BulkUploadProvider` drawer scoped to that field, and the `onSuccess` callback appends the newly created doc IDs to the field value.

- **Polymorphic field-level upload (v3.6).** When `relationTo: string[]`, a `Select` slug switcher renders above the picker; switching the slug rebinds the inner `RelationshipPicker` and the "Upload new" drawer to the active slug. The wire value is a `{ relationTo, value }` envelope (or an array of envelopes for `hasMany`), identical to a polymorphic relationship. Thumbnails are fetched per-slug in one batch each (`GET /api/{slug}?where[id][in][]=...&depth=0` per slug that has selected ids).

- **Client-side direct upload (v3.23) — wired, but BLOCKED on R2 in Payload 3.84.1.** The intent: when a storage adapter is configured with `clientUploads`, the browser uploads the file **straight to the bucket**, bypassing the Worker/server body-size limit. The bridge consumes Payload's app-wide `useUploadHandlers().getUploadHandler({ collectionSlug })`: when a handler is registered, it runs the client upload, then sends the `file` multipart part as **metadata-only JSON** (`{ clientUploadContext, collectionSlug, filename, mimeType, size }` — the exact shape Payload's `createFormData` produces); the adapter's proxied static handler recognizes `clientUploadContext` and skips re-uploading. When no handler is registered, the part stays the raw binary File — the v3.5 server-multipart path, unchanged. **Capability-detected, not hard-required**, so the bridge side is safe to leave in place.
  - **Why it's disabled here:** `@payloadcms/storage-r2@3.84.1` is broken — its `initClientUploads` call omits `extraClientHandlerProps`, so the R2 client handler is invoked with `extra: undefined` and throws `Cannot read properties of undefined (reading 'chunkSize')` on every upload. This is upstream (would break any R2 + `clientUploads: true` on this version), unfixable from app config. So `clientUploads` is left **off** and uploads use the working server-multipart path. Re-enable by upgrading R2 once fixed, or via a pnpm patch defaulting `extra = {}` in `R2ClientUploadHandler` (mirrors the existing `countGlobalVersions` patch). The bridge needs no change either way.

- **Cloud-storage client-side direct upload (`uploadConfig.handlers`) is NOT in scope.** The bridge always sends binary multipart. Server-side storage adapters (e.g. `@payloadcms/storage-s3`) work transparently because they intercept in hooks after the server receives the binary.

#### drafts + autosave + version history (v3.6): how it works

When `collection.versions.drafts` is set, the bridge swaps in the v3.6 drafts surface:

- **Status bar (`DocStatusBar`).** Top-of-form pill cycles through `Draft` / `Published` / `Modified` / `Saving…` / `Autosaving…` / `Saved · HH:MM:SS` / `Save failed`. When a file is staged for an upload-collection multipart submit, the pill is joined by an "Autosave paused — file pending" hint. The bar only renders when drafts are on — non-drafts collections see the v3.5 single-Save button matrix unchanged. (v3.9 removed the inline "Version history" button; the header **Versions** tab is now the single entry point — see §7b.6.)

- **Submit-mode plumbing.** The bridge's `submit()` takes one of four modes:

  | Mode | URL query | When |
  |---|---|---|
  | `save` | none | Drafts off — drives the single `[Save]` / `[Create]` button. |
  | `saveDraft` | `?draft=true` | Drafts on — `[Save draft]` button. |
  | `publish` | `?draft=false` | Drafts on — `[Publish]` button (also used by the form's default submit, e.g. Enter key, on drafts-enabled collections). |
  | `autosave` | `?draft=true&autosave=true` | Background — never wired to a button; fired by the autosave debounce. |

  Manual modes run the existing pre-submit checks (required-field walk, JSON parse-error sweep, auth-create extras, upload-collection file requirement). Autosave skips all of these — drafts permit invalid data and we never want autosave to block typing or surface an error banner.

- **Button matrix.**

  | Drafts | Mode | `showSaveDraftButton` | Buttons |
  |---|---|---|---|
  | off | any | — | `[Discard] [Save]` (or `[Create]`) |
  | on | edit | `true` (default) | `[Discard] [Save draft] [Publish]` |
  | on | edit | `false` (autosave covers it) | `[Discard] [Publish]` |
  | on | create | any | `[Discard] [Save as draft] [Publish]` (autosave is not scheduled in create mode — no id to PATCH) |

- **Autosave concurrency state machine.** A single ref-driven flow with four guarantees:

  1. **Debounced.** Every value/dirty change clears and re-arms `setTimeout(submit('autosave'), interval)`. The interval defaults to Payload's 800ms; override with `versions.drafts.autosave.interval`.
  2. **Single-flight.** A new autosave never starts while one is in flight (`autosaveInFlightRef`); the next value change after success re-arms the debounce. Lexical can spam onChange on every keystroke — debounce + single-flight absorbs it.
  3. **Manual save wins.** Clicking Save draft / Publish acquires `manualSaveInFlightRef`, calls `autosaveAbortRef.current?.abort()`, and clears any pending debounce. The autosave fetch's `AbortError` is silently swallowed.
  4. **Hard-skipped on file-pending.** When a file is staged (`pendingFile !== null || uploadEdits !== null`), the scheduler short-circuits — multipart over an 800ms loop would thrash Payload's parser and racy file uploads aren't worth solving for autosave.

- **Path→value snapshot for dirty cleanup.** This is the subtle part. The autosave PATCH body ships the WHOLE value of each dirty top-level container (per the §"Edit-mode PATCH shape" rule). After success we want to drop the paths that were "definitively saved" — but if the user typed into `body` during the in-flight save, the version we shipped is older than what's on screen, so `body` MUST stay in dirty. The bridge solves this by snapshotting a `Map<path, currentValueRef>` at submit time and only clearing dirty paths whose current value still **deep-equals** the snapshot. Reference equality is the cheap pre-check (`setByPath` only clones the spine it touches, so untouched branches keep their references); structurally-equal-but-replaced values fall through to the recursive walk. Keys-only cleanup would silently mark `body` saved on the in-flight value — wrong. Manual saves clear the entire dirty set unchanged.

- **Version history.** v3.9 replaced the inline MVP dialog with full views reachable from the header **Versions** tab — see §7b.6.

- **Initial doc read.** Payload's `@payloadcms/next` `getDocumentData.js` already refetches with `draft: true` when drafts are enabled, so `serverProps.doc` is the latest version automatically — no RSC refetch needed in our wrapper.

- **`docPermissions` forward-compat.** v3.6 lifts `initPageResult.docPermissions` through the RSC wrapper into the bridge and threads it to `FieldInput` as an unused optional prop. v3.7's access-control field hiding becomes a leaf-only change.

#### access-control field hiding (v3.7): how it works

Payload sanitizes field-level `access.read` / `access.update` predicates per request into a tree of `Permission` values (either `true`, `false`, or `{ permission: boolean, where? }`) and exposes the result on `useDocumentInfo().docPermissions`. v3.7 walks that tree alongside the field schema and:

- **Hides read-denied fields.** A leaf with `access.read === false` returns `null` from `renderField`. The field never enters `dirty` because there's nothing to interact with.
- **Renders update-denied fields as readonly.** A leaf with `access.update === false` is rendered with `disabled = true` AND a small `Lock` icon next to the label so users understand why. The input is still visible — denial is communicated, not concealed.
- **Hides empty structural containers.** `row`, `collapsible`, `group`, and `tabs` containers vanish when every nested leaf is read-denied. `isFieldVisible` recurses into children so a `group → tabs → group → field` chain with no readable leaves anywhere correctly hides at the outermost container. Individual tabs are also hidden when their own subtree is empty (the tabs widget itself only disappears when ALL tabs are empty).
- **Recurses into `array` / `blocks`.** `ArrayInput.rowPerms` carries the array's own `FieldPermissions` so per-row subfields are gated against `arrayPerms.fields[subfield]`. `BlocksInput.blockPerms` does the same and additionally derives per-block perms via `blockPerms.blocks[blockType].fields`. Per-row visibility is per-subfield — a row's `label` may be readable while its `secret` is hidden.

**Wire-shape contract.** v3.7 does NOT strip dirty paths from the submit body — hiding alone is sufficient defense-in-depth. A read-denied field is never user-touched (no path lands in `dirty`); an update-denied field is disabled. The whole-top-level-container PATCH ships unchanged values for any leaf the user couldn't edit (the server enforces and accepts because nothing changed). If a custom `.input` override bypasses the disabled state and emits an onChange, the server will reject — desired behavior.

**Permissions plumbing.** `parentPerms` threads through `renderChild` as a third positional arg (`(child, pathPrefix, parentPerms) => ReactNode`). The top-level call uses `documentInfo.docPermissions`; transparent structurals (row, collapsible) share the parent's perms; named containers (group, named tab, array, blocks) derive sub-perms via `subPerms(parent, name)`. Synthesized fields (`__password`, `__confirmPassword`) always render — they're outside the schema's permission set.

**Helpers** are exported from `src/utils/fieldPermissions.ts`: `canRead`, `canUpdate`, `subPerms`, `subBlockPerms`, `isFieldVisible`, `isAllowed`.

#### create-mode access + array/blocks row gating (v3.18): how it works

v3.7 gated every field on `access.update`, regardless of whether the form was creating or editing. v3.18 makes the write gate **operation-aware**, matching how Payload enforces server-side: `access.create` runs only on create operations, `access.update` only on update operations. `FieldTreeRenderer` now computes the read-only/lock state from `canCreate(parentPerms, name)` on the create form and `canUpdate(...)` on the edit form (the new `canCreate` helper mirrors `canRead`/`canUpdate`).

This single change closes two gaps at once:

- **`access.create` visualization.** A field whose `access.create === false` renders disabled with a lock icon on the **create** form (previously it let users fill anything and the server rejected on submit). The same field is editable on the edit form if `access.update` allows it. **Caveat — autosave collections have no pure-create form:** when `versions.drafts.autosave` is on, Payload creates a draft immediately on entering the create route and switches to edit mode (`operation: update`), so this create-mode lock never surfaces in the UI there (the create is enforced server-side during the instant autosave-create). The visualization only manifests on **non-autosave** collections, whose `/create` form has a real pre-save create state.
- **Array / blocks add-row gating.** Payload has no per-row access grant — adding, removing, or reordering rows during a create is governed by the array/blocks field's `create` access, and during an edit by its `update` access. Because the operation-aware read-only state flows as `disabled` through `FieldInput` → `ArrayInput` / `BlocksInput`, the **Add row / Remove / drag-reorder controls are greyed out** whenever the field is write-denied for the current operation. There is no separate per-control gating (it would diverge from server enforcement: e.g. `create:false, update:true` must still allow adding rows while editing). The affordance is the greyed-out button plus the field-label lock icon — no second lock icon on the buttons.

**Out of scope (still).** Per-subfield gating *inside* an array/blocks container is checked independently of the container's own denied state — a subfield can remain editable even when the array's `update` is denied (the container's `disabled` does not propagate into the per-subfield recursion, which recomputes from `docPermissions`). This is a pre-existing v3.7 limitation, tracked separately in FEATURES.md.

#### localization (v3.8): how it works

When `localization` is configured on `payload.config.ts` (`locales`, `defaultLocale`) and any of a collection's fields are marked `localized: true`, the doc form turns on multi-locale editing:

- **Locale switcher.** A `LocaleSwitcher` (shadcn `Select`) mounts in the doc form header. Hidden when only one locale is configured (single-locale config falls back to v3.7 behavior unchanged). Switching the locale is **client-state-only** — no router push — so unsaved edits in the previous locale survive the switch.

- **Hybrid fetch.** The RSC wrapper (`AutoCollectionDocView`) supplements Payload's upstream single-locale doc fetch with a `payload.findByID({ ..., locale: 'all', draft: <draftsOn>, fallbackLocale: false })` call on edit mode. The bridge then carries the full `{en: …, fr: …, de: …}` value per localized leaf in its `values` state. **The `draft: true` flag is critical** — without it, the refetch returns the published version and any draft-only edits silently revert to empty on `router.refresh()` after a save. richText `customComponents.Field` elements are still pre-rendered for one locale at a time (the URL/active one); switching locales fires an immediate `getFormState({locale: target})` rebuild that refreshes every richText editor's pre-rendered Field for the new locale (extends the v3 rebuild loop).

- **Value shape (unified).** `values: Record<string, unknown>` keeps the same flat-by-path layout from v3.6. The only change is that at every path whose schema leaf has `localized: true`, the stored value is the locale-keyed object straight from Payload's `?locale=all` response. Non-localized leaves stay flat. `setValueAtPath(path, next)` reads `field.localized` from a precomputed schema-path set; when localized, it merges `next` into the active locale's slice (`values[path] = { ...current, [activeLocale]: next }`) instead of replacing the locale-keyed object.

- **Dirty tracking.** `dirty: Set<string>` continues to drive "anything dirty?" UX (Discard button, beforeunload guard, status pill). A side-channel `dirtyLocalesRef: Map<path, Set<locale>>` tracks WHICH locales of a given path are dirty (only for localized paths; non-localized paths have no entry). Both manual save and autosave success cleanup are locale-scoped — they drop the saved locale from each path's locale set and only remove the path from `dirty` when no other locale remains dirty. A user can edit `title` in en, switch to fr, edit `title` in fr, switch back, save in en — the fr edit survives intact.

- **Submit shape** (mirrors `@payloadcms/ui`'s `PublishButton`/`SaveDraftButton` so the experimental `localizeStatus` flow lands correctly):

  | Mode | URL params | Body shape |
  |---|---|---|
  | `saveDraft` | `draft=true&locale=<active>` | dirty top-level containers, active-locale projected |
  | `autosave` | `draft=true&autosave=true&locale=<active>` | same |
  | `publish` (no `localizeStatus`) | `draft=false&locale=<active>` | **all** top-level keys projected + `_status: 'published'` |
  | `publish` (with `localizeStatus`) | `locale=<active>&publishSpecificLocale=<active>` (no `draft=`) | **all** top-level keys projected + `_status: 'published'` |
  | `publishAllLocales` | `locale=<active>&publishAllLocales=true` (no `draft=`, no `locale=all`) | **all** top-level keys projected + `_status: 'published'`; server flips every locale's `_status` using each locale's existing drafts |

  Body is always **flat** (active-locale-projected) via `projectLocaleAtLeaves(values, fields, activeLocale)`. Payload's writer normalizes per-locale storage from `?locale=<active>`. Publish modes ship **every** top-level key (not just `dirty`) because Payload validates the full doc when publishing and autosave may have already cleared `dirty`. The required-empty pre-submit walk uses the same projection so a `{en:"hi", fr:""}` localized required field correctly fails in fr but not en; publish-all additionally walks every locale and surfaces a top-level banner like *"Cannot publish all locales — required fields missing: Title (fr), Title (de)"* before the PATCH leaves the client.

- **Autosave + locale switch coordination.** In-flight autosave is **not** aborted on locale switch (diverges from the manual-save-aborts-autosave pattern). The autosave URL bound `?locale=<en>` at submit time and the body was projected from `dirtyByLocale[en]`; letting it complete is wire-correct. An `autosaveSnapshotLocaleRef` captures the locale at snapshot time so cleanup compares the right slice and prunes only that locale from `dirtyLocales[path]`. A new autosave for the now-active locale arms via the existing debounce as soon as the user types post-switch.

- **No fallback hint.** When the active locale's value is empty, the input renders empty — matching Payload's own admin behavior. There's no "Showing fallback (en): «…»" surface. Editors switch the dropdown to see the source text. This is an explicit design choice (see `payload.config.ts` `localization.fallback: false` in the canary).

- **`versions.drafts.localizeStatus: true`** (experimental in Payload 3.84.1; requires `experimental.localizeStatus: true` in payload config). When enabled with multiple locales:
  - Submit row gains `[Publish (en)] [Publish all locales]`. The `Publish` button label shows the active locale so the user knows what they're committing. See the wire shapes in the Submit shape table above.
  - `_status` storage flips from a flat string to a locale-keyed object (`{en: "published", fr: "draft", …}`).
  - **DocStatusBar renders one pill per locale (v3.8.1).** Each pill shows `EN · Draft`, `FR · Published`, etc. The **active** locale's pill carries the lifecycle states (`Modified`, `Saving…`, `Autosaving…`, `Saved · 12:43`, `Save failed`); non-active pills show only their persisted draft/published flag. The active pill has a thin ring to distinguish it. When `_status` is still a flat string (legacy doc / pre-localizeStatus state), the bridge fans the same value across every locale's pill so the row never shows blanks.

- **richText edge case.** Lexical's `onChange` is async-committed; final keystrokes during a locale switch may land in the previous locale's `value[prev]` slot. Documented as a known edge case; not solved in v3.8.

- **Mid-switch in-flight autosave** continues against the original locale's URL. The status bar's `Autosaving…` pill still shows during the switch; the cleanup correctly scopes to the originating locale. With per-locale pills (v3.8.1) the pill would render against the originating locale explicitly.

#### schedule-publish (v3.15): how it works

When a collection or global sets `versions.drafts.schedulePublish` (boolean or `{ timeFormat?, timeIntervals? }`), Payload registers a `schedulePublish` jobs task and the bridge shows a **Schedule** popover next to the Publish button (edit-mode only — a scheduled job needs an existing doc id).

```ts
versions: {
  drafts: {
    schedulePublish: true, // or { timeIntervals: 15 }
  },
},
```

- **Surface.** Date+time picker (shadcn `Calendar` + native time input), a **timezone picker** populated from `config.admin.timezones.supportedTimezones` (Payload ships a default list), a Publish/Unpublish toggle, and — for any localized collection/global with multiple locales — a "Locale to publish" select (default *All locales*; a specific locale maps to Payload's `publishSpecificLocale`, matching the native drawer). Below, an **Upcoming** list of this doc's scheduled events with a per-row cancel.
- **Wire.** Scheduling/canceling go through Payload's `schedulePublish` **server function** (`useServerFunctions()`), exactly like the bridge's `getFormState`. The picked wall-clock is converted to an absolute instant in the chosen zone via `@date-fns/tz`'s `TZDate`. The upcoming list mirrors the native REST query: `POST {apiRoute}/payload-jobs` with `X-Payload-HTTP-Method-Override: GET` and a `qs-esm`-encoded `where` on `taskSlug=schedulePublish` + this doc/global. Collections pass `doc: { relationTo, value }`; versioned globals pass `global: slug`.
- **⚠️ Execution is the host's job.** The plugin only *queues* the job. For scheduled events to actually fire at `waitUntil`, the consuming app must run the jobs queue — e.g. `jobs.autoRun` in `payload.config.ts`, or an external cron hitting the jobs run endpoint. On Cloudflare Workers, wire a [scheduled handler / cron trigger](https://developers.cloudflare.com/workers/configuration/cron-triggers/) that invokes `payload.jobs.run()`. Without this, scheduled events are stored but never publish.

#### Function-typed `defaultValue`

`field.defaultValue: ({ locale, req, user }) => …` (function form) is **resolved server-side by Payload's `beforeValidate` hook at create-time**, not by the admin form. Payload's own admin shows empty fields for function-typed defaults during create until the document is first saved; this plugin's behavior is identical. The plugin's `seedDefaults` only honors **static** `defaultValue` values (primitives, arrays, plain objects) carried across the RSC→Client boundary via `extractCollection`.

If you need a value visible in the form before first save, hoist it to a static default and replace at submit time, or compute it client-side via a per-field `.input` override.

### Pre-flight skip

If any **required** field on the collection has an unsupported type, the plugin SKIPS auto-installation for that collection and logs a single `console.warn` at startup naming the blocking types:

```
[plugin-shadcn-admin] Skipping defaultDocView for "{slug}": required fields of unsupported types: {types}. Falling back to Payload's default edit view.
```

Collection-level `upload: { ... }` is **no longer** a blocker as of v3.5 — the bridge renders a dropzone above the field list and handles multipart submission natively.

The skip helper walks into `group`, `tabs`, `array`, and `blocks` containers, so a required field of an unsupported type deep inside an array row will block too (its path appears in the warning, e.g. `items[].thing`).

Optional unsupported fields don't trigger the skip — they're silently omitted from the rendered form (and preserved untouched server-side on PATCH because edit-mode PATCH only sends the dirty top-level containers).

### Field skip rules

The doc form renders top-level fields in `collection.fields` order, skipping:

- `id`, `createdAt`, `updatedAt`
- fields with `admin.hidden: true` or `hidden: true`
- fields with `custom['plugin-shadcn-admin'].hideInDocForm: true` (a plugin-namespaced opt-out flag — mirror of the `.cell` override pattern from §7b)
- auth-internal fields (`salt`, `hash`, `sessions`, etc.) — auth collections in create mode get a synthesized `Password` + `Confirm password` pair injected automatically

`row` and `collapsible` wrappers are flattened transparently: `row` renders as a horizontal flex group, `collapsible` renders inside a shadcn `<Collapsible>` (open by default). `group` renders as a labeled section; named `tabs` use shadcn `<Tabs>` with one trigger per tab (unnamed tabs flatten their subfields into the doc root, matching Payload's storage shape).

### Validation

- HTML5 `required` attributes are set on inputs as a UX hint.
- Before issuing the request, the form runs a client-side pass that red-borders any empty required field and aborts the request — so a slow connection doesn't bounce the user through a 4xx for trivially-missing fields. The required-pass walks into array/blocks rows, so a missing required subfield on row 3 reports as `items.2.label`, not just `items`.
- A required `array` or `blocks` field with zero rows also fails the pre-submit check.
- The server is authoritative. On a 4xx response, the form parses both of Payload's error shapes:
  - flat: `{ errors: [{ field, message }] }`
  - nested: `{ errors: [{ name: 'ValidationError', data: { errors: [{ path, message }] } }] }`
  Path values are preserved verbatim as the error key (e.g. `items.0.label`), so subfield renderers can look up errors by their full dotted path. Non-field errors render in a banner at the top.

### Edit-mode PATCH shape

Payload's REST contract replaces `array` and `blocks` wholesale (no per-row partials) and expects full `group` / named-`tab` objects on PATCH. The form keeps **subfield-granular dirty/error state internally** (so the UI highlights the specific subfield you touched and shows errors keyed by full dotted paths), but the PATCH body it builds ships the WHOLE current value of every dirty top-level container. Edit one cell of `items.0.label` and the wire payload is the full `items` array with the one edited subfield updated and all other rows preserved verbatim — not a `{ "items.0.label": "..." }` partial.

This matters when debugging network traffic: don't expect dotted-path keys in PATCH bodies, even though the form's internal dirty/error state uses them.

### Per-field `.input` override

For escape-hatch cases where the built-in input doesn't fit, set a `custom['plugin-shadcn-admin'].input` reference on the field config:

```ts
// apps/cms/src/admin/inputs/PriceInput.tsx
'use client'
export const PriceInput = ({ value, onChange, ... }) => { /* ... */ }

// apps/cms/src/collections/Products.ts
{
  name: 'price',
  type: 'number',
  custom: {
    'plugin-shadcn-admin': {
      input: PriceInput, // client reference from a 'use client' module
    },
  },
}
```

**Constraint:** the input function you put in `custom['plugin-shadcn-admin'].input` must be a **client reference** — i.e., defined in (or exported from) a `'use client'` module in your consumer app's source. A function declared inline in `payload.config.ts` will fail to cross the RSC→Client boundary at serialization time with a "Functions cannot be passed directly to Client Components" error. This is the same constraint as the verified `.cell` override (§7b).

The override receives the full `FieldInputProps` shape — `field, value, useAsTitleBySlug, onChange, id, required, invalid, disabled, nestedPath, renderChild` — and is responsible only for rendering the input itself (the label, required marker, description, and error display stay in the form's row chrome). Overrides participate in dirty tracking and error display automatically because they call the `onChange` handed in by the bridge.

### After-save behavior

- **Create**: on success, navigates to `/admin/collections/{slug}/{newId}` — which is also our view, so the user continues in the same shadcn form populated with the new doc.
- **Edit**: on success, `router.refresh()` re-loads the server view.

## 7b.6. Versions workflow (`edit.versions` / `edit.version`) — v3.9

When `defaultDocView` installs the auto doc view on a collection **and** that collection has `versions` configured, the plugin also fills the `edit.versions` and `edit.version` route slots (consumer-defined `edit` views still win — the same guard as `edit.default`). This makes the header **Versions** tab (`DocViewTabs`, href `/admin/collections/{slug}/{id}/versions`) land on the plugin's own shadcn chrome instead of Payload's default versions UI. No change was needed to the tab href — only the slot wiring.

Two RSC views, both rendered inside `ViewShell` with `className="shadcn-auto-doc-view"` (so Payload's `.doc-header` stays hidden) and `DocViewTabs active="versions"`:

- **`AutoVersionsView`** (`edit.versions`, the LIST). Fetches a page via `payload.findVersions({ collection, where, sort: '-updatedAt', limit: 20, page, depth: 0, req, overrideAccess: false })`. The `where` is `{ and: [ { parent: { equals: docID } } ] }`, plus `{ snapshot: { not_equals: true } }` when localization + drafts are both on — this mirrors Payload's native list and excludes the per-locale publish "snapshot" rows that would otherwise show as duplicates. Renders the client `VersionsList` (shadcn `Table`): each row links to `versions/{id}`, shows a draft/published pill (+ `publishedLocale` marker when present) and manual/autosave type. Pagination writes `?page=`; no more 20-row cap. The list shows **all** versions across locales — like Payload's native view, it intentionally does **not** filter the list by locale (per-locale awareness lives in the diff view's locale pills, and `publishedLocale` is too sparse to be a useful row filter).

- **`AutoVersionView`** (`edit.version`, the single-version DIFF). Mirrors Payload's data-flow: the version id is the last `routeSegments` entry; `versionTo` is fetched at `locale: 'all'`, `depth: 1`; `versionFrom` comes from `?versionFrom` (else the immediately-prior version by `updatedAt`); the compare dropdown options are the doc's recent versions. `buildDiffFields` walks the `ExtractedField[]` and renders a From→To diff per changed leaf using `@payloadcms/ui/elements/{FieldDiffContainer,FieldDiffLabel,HTMLDiff}` — recursing group/tabs/row/collapsible/array/blocks and expanding each `localized` leaf once per selected locale. Only changed fields render.

  - **URL params:** `?versionFrom=<id>` (compare target, written by `SelectComparison`); `?localeCodes=<json-array>` (scope the diff to a subset of locales, written by `SelectLocales` — omitted means all). 
  - **Restore** (`RestoreVersion`): `POST /api/{slug}/versions/{versionId}` ( `?draft=true` for **Restore as draft**, shown only when drafts are on), then navigate back to the doc edit view. This is the same endpoint the old MVP dialog used.
  - **richText (v3.24): structural HTML diff.** Each side is serialized to HTML (`richTextToDiffHTML` — block tags for paragraph/heading/list/quote, inline tags from the Lexical text-format bitmask for bold/italic/strikethrough/underline/code/sub/sup, `<a>` for links, typed placeholders for void nodes like upload/relationship/block) and fed through the same `getHTMLDiffComponents`. So paragraph↔heading, list, link, and inline-format changes now diff granularly alongside text edits — not a flattened-text word diff. **Limitation:** the HTML differ doesn't detect *moved* blocks (a reordered block shows as delete + add), and void-node payloads are shown as a typed placeholder, not their rendered content. This is the bounded alternative to a full Lexical tree-diff with node alignment.

The diff primitives resolve through `@payloadcms/ui`'s `./elements/*` export wildcard and render server-side, so the diff view stays an RSC; only the compare/locale selectors and restore buttons are client islands. `@payloadcms/translations`' `I18nClient` isn't directly resolvable from the plugin, so `buildDiffFields` types `i18n` opaquely and casts at the single `FieldDiffContainer` call site.

## 7b.7. Zero-config auto doc view for globals (`defaultGlobalView`) — v3.14

Opt-in plugin option that auto-installs the shadcn doc form on Payload **globals**, mirroring `defaultDocView`:

```ts
plugins: [
  shadcnAdminPlugin({
    defaultGlobalView: 'all',                  // every eligible global
    // or: shadcnAdminPlugin({ defaultGlobalView: ['homepage'] })
    // default: false (no behavior change)
  }),
]
```

For each matching global that doesn't already define `admin.components.views.edit`, the plugin's `installAutoGlobalDocView` walks `config.globals` and installs the **same** `rsc#Auto*` components at `edit.default` / `edit.api` (and `edit.versions` / `edit.version` when the global has `versions`). The same field-type eligibility skip as `defaultDocView` applies (warns once per slug; `findBlockingRequiredFields` treats a global like `{ fields }` — globals are never upload entities). Consumer-defined `views.edit` wins.

**Globals are singletons**, so the doc-form stack runs against `globalConfig` with three differences from collections:

- **RSC entry** (`AutoCollectionDocView` / `AutoVersionsView` / `AutoVersionView` / `AutoApiView` branch on `initPageResult.globalConfig`): no `docID`; initial all-locales data via `payload.findGlobal({ slug, locale: 'all', draft })`; breadcrumbs `/admin/globals/{slug}`. `extractGlobal` projects the global into the same `ExtractedCollection` shape the bridge consumes (`label` → `labels.singular`; `auth`/`upload` false).
- **Submit wire** (`AutoDocFormBridge` gains a `globalSlug` prop): always `POST /api/globals/{slug}` — never PATCH, no create mode, no post-save navigation (just `router.refresh()`). Autosave is allowed without a doc id. Draft/autosave/publish/locale query params and `_status` overrides are byte-identical to the collection path (Payload's `PublishButton` uses the same shape, just branching on `globalSlug`). `getFormState` (richText rebuild) passes `{ globalSlug, schemaPath: globalSlug }`.
- **Versions** (`edit.versions` / `edit.version`, only when `versions` is enabled): `payload.findGlobalVersions({ slug })` / `findGlobalVersionByID({ slug, id })` (no per-doc `parent` filter — global versions scope by slug); **Restore** → `POST /api/globals/{slug}/versions/{versionId}`.

`DocViewTabs` builds `/admin/globals/{slug}` hrefs (no id) when `useDocumentInfo().globalSlug` is set, and takes a `hasVersions` prop so the **Versions tab is hidden on non-versioned globals** (and non-versioned collections — gated for both). Globals surface in the sidebar via `NavItem.globalSlug`. Deferred: global Live Preview (same as collections).

## 7c. Zero-config Nav (`defaultNav`)

Opt-in plugin option that auto-installs a shadcn Nav at `admin.components.Nav`:

```ts
plugins: [
  shadcnAdminPlugin({
    defaultListView: 'all',
    defaultNav: {
      branding: { name: 'CMS', subtitle: 'Payload admin' },
      // Optional: explicit sidebar tree (see below)
    },
  }),
]
```

When set, the plugin installs `DefaultNav` (an RSC) at `admin.components.Nav` *only if* the consumer hasn't already set their own Nav. Branding and sidebar tree are stashed on `config.custom['plugin-shadcn-admin'].nav` and read by `DefaultNav` at render time.

### Branding

```ts
branding: {
  name: 'CMS',                  // top-line label
  subtitle: 'Payload admin',    // optional
  icon: 'Box',                  // lucide icon name (PascalCase)
  href: '/admin',               // optional, defaults to /admin
}
```

`icon` is an `IconRef`: either a **lucide-react PascalCase name string** (e.g. `'Users'`, `'Image'`, `'Settings2'`) or a `React.ComponentType<{ className?: string }>`. **Use the string form when configuring via plugin options** — `payload.config.ts` runs in Node, not in Next.js's bundler, so component references imported there resolve to raw `forwardRef` objects that fail RSC→Client serialization. The component form only works when the config originates from a bundled module (e.g. a hand-written Nav.tsx, see §5 / §9). For custom SVGs, the escape hatch is to write your own Nav using `<NavShell>` + `<DefaultAdminSidebar>` from a bundled module.

### Sidebar tree (explicit)

Omit `sidebar` and the Nav renders a flat auto-list of all non-hidden collections. Provide `sidebar.groups` to control grouping, ordering, icons, globals, custom links, and collapsibles:

```ts
defaultNav: {
  branding: { name: 'CMS', subtitle: 'Payload admin' },
  sidebar: {
    groups: [
      {
        label: 'Content',
        items: [
          { label: 'Users', collectionSlug: 'users', icon: 'Users' },
          { label: 'Media', collectionSlug: 'media', icon: 'Image' },
        ],
      },
      {
        label: 'System',
        items: [
          {
            label: 'Settings',
            icon: 'Settings2',
            items: [
              { label: 'Dashboard', href: '/admin' },
              { label: 'Account', href: '/admin/account' },
              { label: 'Logout', href: '/admin/logout' },
            ],
          },
        ],
      },
    ],
  },
}
```

(Icons are lucide-react PascalCase names — see the [lucide icon list](https://lucide.dev/icons). Use the string form whenever the config lives in `payload.config.ts`.)

**Item shape (`NavItem`):**

| Field | Notes |
|---|---|
| `label` | Required visible label. |
| `href` | Explicit URL. Takes precedence over the slug shortcuts. |
| `collectionSlug` | Shortcut: resolves to `/admin/collections/{slug}`. |
| `globalSlug` | Shortcut: resolves to `/admin/globals/{slug}`. |
| `icon` | `IconRef` — lucide PascalCase name string (recommended for plugin options) or component. |
| `items` | Sub-items render as a `<Collapsible>` with `<SidebarMenuSub>`. When present, the parent itself toggles the collapsible (no nav). |

**Group shape (`NavGroup`):**

| Field | Notes |
|---|---|
| `label` | Optional section header (e.g. "Platform"). Omit for an unlabelled group. |
| `items` | Required list of `NavItem`s. |

Types are exported from `payload-plugin-shadcn-admin/types`: `AdminBranding`, `IconRef`, `NavGroup`, `NavItem`, `DefaultNavConfig`.

**Why string icons?** Components imported in `payload.config.ts` resolve to raw `forwardRef` objects (Node loads the config unbundled; the `'use client'` directive is only honored by the Next.js bundler), and raw forwardRef objects fail to serialize across the RSC→Client boundary. Strings serialize trivially; the client-side `Sidebar` looks them up in lucide's registry. If you need a custom SVG, write your own Nav (see §5 / §9) using `<NavShell>` + `<DefaultAdminSidebar>` — that file *is* bundled by Next.js, so a direct component reference works there.

## 8. Adding more shadcn components

If you need a primitive the plugin doesn't ship (Tabs, Dialog, Popover, etc.), add it to the **plugin**, not your app. From the plugin directory:

```bash
cd packages/payload-plugin-shadcn-admin
npx shadcn add tabs
```

shadcn-cli writes the component to `src/ui/tabs.tsx`. Then re-export it from `src/exports/client.ts` so consumers can import from `payload-plugin-shadcn-admin/client`. Rebuild the plugin (`pnpm build`).

If you really want a component that lives only in the consumer (project-specific composition), keep it in `src/components/…` in the app — but don't duplicate vendored shadcn primitives there; always pull them from the plugin.

## 9. If you can't use the source layout

When installing from a registry (rather than from a pnpm workspace), the plugin's source is at `node_modules/payload-plugin-shadcn-admin/dist`. Tailwind v4's `@source` directive works against compiled JS too — point `@source` and the trailing `@import` of `styles.css` at the `dist` paths instead. Everything else is unchanged.

---

See [FEATURES.md](./FEATURES.md) for a high-level feature overview and the live list of deferred features.

# Adding a dashboard widget

The `defaultDashboard` admin landing page (`/admin`) is an arrangeable grid of
widgets: drag to reorder, resize (Small / Medium / Full width), hide, and add
back via the "Add widget" menu. Layout is persisted per-user through Payload's
preferences API.

Widgets are currently **plugin-internal only** — there is no consumer-facing
config API to register a widget from `payload.config.ts` yet (see "If you want
a consumer registry" at the bottom). This doc is about adding a new built-in
widget to the dashboard shipped by this plugin.

## The pieces

```
src/features/dashboard/
├── AutoDashboardView.tsx        RSC entry point (installed at
│                                 admin.components.views.dashboard). Fetches
│                                 data, builds the `widgets` array, renders
│                                 <DashboardGrid widgets={widgets} />.
├── DashboardWidgets.tsx         Widget CONTENT components (plain Server
│                                 Components — no 'use client'). Add new
│                                 widgets here, or in a new file next to it.
├── DashboardGrid.tsx            Client shell: drag/resize/hide/add-back
│                                 chrome. You will not normally touch this
│                                 when adding a widget.
└── prefs/
    └── useDashboardLayoutPrefs.ts   Persistence hook (order/size/hidden).
                                      You will not normally touch this either.
```

A widget is just `{ id, label, node }` — `node` is pre-rendered JSX, not a
component reference. `AutoDashboardView` renders the widget's content on the
server (so it can freely call `payload.find` / `payload.count` / hit an
external API) and hands the *already-rendered* React element to the client
`DashboardGrid`, which only needs to move an opaque node around — it never
re-renders widget content. This is the standard "Server Component as children
of a Client Component" pattern; it's why `DashboardWidgets.tsx` has no `'use
client'` directive.

## Steps

### 1. Write the widget's content

In `DashboardWidgets.tsx` (or a new file, for a bigger widget), export a
function component that returns the widget's JSX. It's a Server Component:
no hooks, no `useState`, no browser APIs. Wrap it in the existing `Card` /
`CardHeader` / `CardContent` primitives from `payload-plugin-shadcn-ui` so it
matches the other widgets visually.

If it needs data, either:
- fetch it in `AutoDashboardView.tsx` (which already has `req`/`payload`/`user`
  in scope) and pass it down as props — see `RecentlyUpdatedWidget`, or
- fetch it inside the widget itself if you gave it `req`/`payload` as props.

Scope every query the same way `buildRecentDocs` does:
`overrideAccess: false` + `user`/`req` — a widget must never show a user data
they can't otherwise read. Wrap external calls in `try/catch` so one widget
failing doesn't blank the whole dashboard (again, see `buildRecentDocs`).

### 2. Register it in `AutoDashboardView.tsx`

Push an entry onto the `widgets` array:

```tsx
if (someData.length > 0) {
  widgets.push({
    id: 'my-widget',       // stable id — see "About ids" below
    label: t('shadcnAdmin:myWidgetLabel'),
    node: <MyWidget data={someData} />,
  })
}
```

Omit the `push` entirely (behind an `if`) when the widget has nothing to show
— an empty-state card is worse than no card. `recently-updated` and
`collections` both follow this rule.

### About ids

The `id` is the persistence key for that widget's order/size/hidden state
(stored per-user in the `payload-preferences` collection, key
`dashboard-layout`). **Never rename or reuse an id for a semantically
different widget** — `DashboardGrid`'s reconciliation treats an id it no
longer recognizes as "removed" (dropped silently) and any new id as "new"
(appended at the end, default size). Renaming an existing widget's id resets
every user's saved position/size for it.

### 3. Localize the label + any UI strings

`label` shows up in the "Add widget" menu (when the widget is hidden) and in
the resize/hide buttons' aria-labels, so it goes through `t()`, not a hardcoded
string. Two options:

- **Reuse a Payload core key** if one already fits — e.g. the built-in
  `collections` widget uses `t('general:collections')` rather than inventing
  its own key, since Payload ships that translation in every language already.
- **Add a `shadcnAdmin:*` key** in `src/translations.ts` if nothing fits.
  Add it to **all four** locale blocks (`en`, `fr`, `de`, `es`) — grep for
  `// Dashboard widgets` in that file to see where the existing widget keys
  live and match the pattern.

In the RSC (`AutoDashboardView.tsx`), get a typed `t` via:

```ts
const t = i18n.t as TFunction<ShadcnAdminTranslationsKeys>
```

(`TFunction` from `../../internal/payloadAdapter.js`, `ShadcnAdminTranslationsKeys`
from `../../translations.js` — see the top of `AutoDashboardView.tsx`.) This is
the same cast `AutoVersionsView.tsx` / `AutoBrowseByFolderView.tsx` use — Payload's
`req.i18n.t` isn't generically typed with plugin-injected keys, so the cast is
required, but it's a type-only cast; the underlying `t` function already has all
the merged translations at runtime.

Any strings inside the widget's own JSX (e.g. a card title) should also go
through `t()` and be passed in as a prop, not hardcoded — see how
`RecentlyUpdatedWidget` takes a `title` prop rather than rendering "Recently
updated" itself.

### 4. Build and verify

From this package directory:

```bash
pnpm typecheck
pnpm build            # rebuilds dist/ — required even in dev-linked mode,
                       # since the starter imports from dist, not src
pnpm run check:internals
```

Then, with `cf-payload-astro-starter` running in `pnpm mode dev` (so it's
workspace-linked to this repo), reload `/admin` and check:

- the new widget appears in its default position/size
- drag, resize (Small/Medium/Full), hide, and "Add widget" all work on it
- **reload the page** — this is the real persistence test; in-memory state
  updates instantly regardless of whether the debounced write to
  `payload-preferences` actually succeeded

## Example: a widget backed by an external API

This sketches the shape for something like an analytics-provider widget
(OpenPanel, Plausible, etc.) — no real integration exists yet, this is a
template:

```tsx
// DashboardWidgets.tsx (or a new AnalyticsWidget.tsx)
export async function AnalyticsWidget({
  apiKey,
}: {
  apiKey: string
}): Promise<React.ReactElement | null> {
  let stats: { pageviews: number; visitors: number } | null = null
  try {
    const res = await fetch('https://api.example-analytics.com/v1/stats', {
      headers: { Authorization: `Bearer ${apiKey}` },
      // Cache per Next.js's fetch semantics — tune to how fresh you need this.
      next: { revalidate: 300 },
    })
    if (res.ok) stats = await res.json()
  } catch {
    // Widget quietly omits itself below if the fetch fails.
  }
  if (!stats) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{stats.pageviews} pageviews · {stats.visitors} visitors</p>
      </CardContent>
    </Card>
  )
}
```

```tsx
// AutoDashboardView.tsx
const apiKey = process.env.ANALYTICS_API_KEY
if (apiKey) {
  const node = await AnalyticsWidget({ apiKey })
  if (node) widgets.push({ id: 'analytics', label: 'Analytics', node })
}
```

Read secrets (API keys) from `process.env` server-side only, same as
`rebuildFrontend`'s deploy-hook URL — never pass them to the client.

## If you want a consumer registry

Today `defaultDashboard` is just `true | false` — widgets are fixed at the
plugin level, decided when this was built (kept deliberately minimal: the
person adding widgets *is* the plugin author, not a downstream app). If a
consuming app (like `cf-payload-astro-starter`) needs to register its *own*
widget from `payload.config.ts` without forking this plugin, that's a bigger
change:

- `PluginConfig.defaultDashboard` becomes `boolean | { widgets?: DashboardWidgetDefinition[] }`
- each `DashboardWidgetDefinition` carries a `PayloadComponent` (the same
  string-path / `{path, exportName}` shape Payload uses for every other custom
  component slot), not a direct component reference
- `AutoDashboardView.tsx` resolves those at render time via
  `RenderServerComponent` (from `@payloadcms/ui/elements/RenderServerComponent`)
  and `req.payload.importMap` — both already confirmed available in this RSC's
  props (see how `@payloadcms/next`'s own `DashboardView` uses them)

Nobody's asked for this yet — don't build it speculatively. If you're reading
this because someone did ask, that bullet list is the shape to implement.

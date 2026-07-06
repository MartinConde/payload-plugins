# payload-plugin-menus

shadcn/ui-themed menu builder for Payload CMS — a dnd-kit nested-tree editor for
building locale-aware navigation menus.

`menusPlugin()` adds one collection (`menus` by default) whose single `tree` field
stores an entire nested navigation tree as JSON, edited through a dnd-kit
"sortable tree" UI instead of Payload's raw JSON editor. Each item links to a document
(from an allow-listed set of collections) or a custom URL, with a label, open-in-new-tab
toggle, and CSS class. An `afterRead` hook denormalizes `{ url, label }` per
document-linked item, so the frontend renders a menu in one fetch with no follow-up
lookups.

## Install

```jsonc
// package.json — shadcn-ui is required at runtime even though npm marks it optional
{
  "dependencies": {
    "payload-plugin-shadcn-ui": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-shadcn-ui",
    "payload-plugin-shadcn-admin": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-shadcn-admin",
    "payload-plugin-menus": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-menus"
  }
}
```

```ts
// payload.config.ts
import { menusPlugin } from 'payload-plugin-menus'

export default buildConfig({
  plugins: [
    menusPlugin({
      linkableCollections: ['pages'],
    }),
    // ...shadcnAdminPlugin() after this — see "Register order" below
  ],
})
```

Register **before** `shadcnAdminPlugin` so the `menus` collection exists when the admin
plugin installs its auto list/doc views over it (consumer-wins: skipped if the slug
already exists).

## Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `linkableCollections` | `string[]` | `['pages']` | Collection slugs a "document" link may target. Falls back to the default if omitted or given an empty array. Any slug not present in `config.collections` triggers a `console.warn` ("linkableCollections includes unknown collection slug(s)…") — it's a warning, not a hard failure, so double-check for typos after renaming a collection. |
| `slug` | `string` | `'menus'` | Slug of the generated collection. |
| `maxDepth` | `number` | – (unlimited) | Max nesting levels (`1` = flat, no submenus). Enforced in the editor UI only (indent controls, drag-depth projection) — not at the API level, so a direct API write can exceed it. |
| `localized` | `boolean` | `true` | Makes the `tree` field localized (no-op if `config.localization` isn't set). Each locale stores its own tree; the editor shows a "sync from another language" panel. |
| `resolveUrl` | `(args: { relationTo, doc, req }) => string \| null \| undefined` | – | Custom per-item URL resolver for `document`-type items. Falling through to `undefined`/`null` uses the built-in strategy: Pages' `breadcrumbs[last].url` → `doc.url` → `/{slug}` → `null`. |
| `resolveOverrideAccess` | `boolean` | `false` | Whether the `afterRead` hook resolves linked docs with `overrideAccess: true`. Default is secure — a doc the viewer can't read resolves to `null` (frontend hides it). Setting `true` leaks label + URL of access-restricted docs to any viewer. |
| `overrides` | `Partial<CollectionConfig>` | – | Merged onto the generated collection. `admin`/`hooks`/`fields` are carefully merged (not wholesale-replaced); everything else is spread as-is. |
| `disabled` | `boolean` | `false` | Skip the whole plugin — no collection, no translations. |

## Tree model

A menu's `tree` is `MenuItem[]`; each item has `id`, `label`, `type: 'document' |
'custom'`, `doc?: { relationTo, value }` or `url?`, `newTab?`, `className?`, and
`children: MenuItem[]` — genuine parent/children nesting, not a flat list with a
parent-id/order column. There's no dedicated `order` field; ordering is positional
(array index) within each node's `children`. A read-only `resolved: { url, label }` is
attached by the `afterRead` hook on every read and is never persisted — the
`beforeChange` hook strips it before saving.

## Register order & the shadcn-admin dependency

`payload-plugin-shadcn-admin` is **not** a declared peer of this package, but the `tree`
field's dnd-kit editor only renders through shadcn-admin's `.input` override mechanism.
Without shadcn-admin **installed**, the collection still builds and the API still
works — the `tree` field just falls back to Payload's default JSON editor (no crash, no
dnd-kit UI). Two separate things to get right:

- **Install** `payload-plugin-shadcn-ui` and `payload-plugin-shadcn-admin` alongside
  this package (see "Install" above) — the dnd-kit editor UI depends on both.
- **Register order in the `plugins: []` array**: call `menusPlugin()` **before**
  `shadcnAdminPlugin()` — see "Register order" above.

## Peer dependencies

```
@payloadcms/next          >=3.84 <3.90
@payloadcms/translations  >=3.84 <3.90
@payloadcms/ui            >=3.84 <3.90
next                       >=15 <17
payload                    >=3.84 <3.90
payload-plugin-shadcn-ui   >=0.0.1  (optional in package.json, required at runtime)
radix-ui                   ^1.4.3
react                       >=19 <20
react-dom                   >=19 <20
```

`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` are bundled `dependencies`
(not peers) — nothing extra to install for drag-and-drop.

## Exports

- `payload-plugin-menus` — `menusPlugin`; types `MenusPluginConfig`, `MenuUrlResolver`;
  and the shared Node-safe tree model + pure helpers: `normalizeMenuItem`,
  `normalizeMenuTree`, `stripResolved`, `mapMenuTree`, `newMenuItem`, plus types
  `MenuItem`, `MenuItemLinkType`, `MenuItemDocRef`, `MenuItemResolved`, `MenuTree`.
- `payload-plugin-menus/client` — `MenuTreeInput` (the `.input` override shell; exists
  mainly for completeness/external reuse — the collection config references it
  directly, not via this export).
- `payload-plugin-menus/types` — type-only re-exports of the above.

Everything under the editor UI beyond `MenuTreeInput` (the tree component, row
component, locale-sync panel, doc picker, tree-mutation helpers) is internal — only
reachable transitively through `MenuTreeInput`'s lazy import.

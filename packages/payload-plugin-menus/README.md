# payload-plugin-menus

shadcn/ui-themed menu builder for Payload CMS — a `menus` collection whose nested
navigation tree is edited through a dnd-kit sortable-tree UI, with an `afterRead` hook
that denormalizes `{ url, label }` per item so a frontend renders a menu in one fetch.

```jsonc
"payload-plugin-menus": "github:MartinConde/payload-plugins#v0.1.0&path:/packages/payload-plugin-menus"
```

Requires `payload-plugin-shadcn-ui` (and in practice `shadcn-admin`) alongside for the
tree editor UI; degrades to Payload's plain JSON editor without them.

Full docs (options, tree model, security notes, frontend helpers):
<https://cf-payload-astro-starter-docs.holy-dawn-2337.workers.dev/plugins/menus/> —
source in [`cf-payload-astro-starter`](https://github.com/MartinConde/cf-payload-astro-starter)
→ `apps/docs/src/content/docs/plugins/menus.md`.

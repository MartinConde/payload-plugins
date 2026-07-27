# payload-plugins

In-house [Payload CMS](https://payloadcms.com) plugins, developed together in one pnpm
workspace. Each package is published/installed independently.

| Package | Description |
| --- | --- |
| [`payload-plugin-shadcn-ui`](packages/payload-plugin-shadcn-ui) | shadcn/ui primitives + doc-form extension hooks (base — every other package depends on it). |
| [`payload-plugin-shadcn-admin`](packages/payload-plugin-shadcn-admin) | shadcn/ui-themed admin chrome (nav/list/doc/dashboard views) + server-driven DataTable. |
| [`payload-plugin-seo`](packages/payload-plugin-seo) | Per-document meta + SERP preview, SEO defaults global, redirects collection. |
| [`payload-plugin-menus`](packages/payload-plugin-menus) | dnd-kit nested-tree menu builder. |
| [`payload-plugin-products`](packages/payload-plugin-products) | Product catalog with a Fabric.js print-area designer. |

## Install (from git, pnpm only)

```jsonc
"payload-plugin-seo": "github:MartinConde/payload-plugins#v0.1.0&path:/packages/payload-plugin-seo"
```

Always pin `payload-plugin-shadcn-ui` alongside any other package — the feature
plugins render their custom field UIs through it.

## Documentation

Full docs (installation, peers, per-plugin options and `payload.config.ts` wiring,
CSS/importmap setup, contributing, releasing) live in the starter repo's docs app:
**<https://cf-payload-astro-starter-docs.holy-dawn-2337.workers.dev/plugins/overview/>** —
source in [`cf-payload-astro-starter`](https://github.com/MartinConde/cf-payload-astro-starter)
→ `apps/docs/src/content/docs/plugins/` (browse locally with `pnpm docs dev` there).
See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the dev loop.

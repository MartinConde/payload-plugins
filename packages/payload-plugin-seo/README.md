# payload-plugin-seo

shadcn/ui-themed SEO plugin for Payload CMS — per-document `meta` group with live
SERP/social preview, a `seo-settings` global, a `redirects` collection, JSON-LD schema
blocks, and a setup wizard at `/admin/seo-wizard`. In-house replacement for
`@payloadcms/plugin-seo` + `plugin-redirects` (don't co-register those).

```jsonc
"payload-plugin-seo": "github:MartinConde/payload-plugins#v0.1.0&path:/packages/payload-plugin-seo"
```

Requires `payload-plugin-shadcn-ui` (and in practice `shadcn-admin`) alongside — they're
optional peers on paper but required at runtime.

Full docs (options, injected surfaces, schema blocks, the frontend-safe `/schema`
export): <https://cf-payload-astro-starter-docs.holy-dawn-2337.workers.dev/plugins/seo/> —
source in [`cf-payload-astro-starter`](https://github.com/MartinConde/cf-payload-astro-starter)
→ `apps/docs/src/content/docs/plugins/seo.md`.

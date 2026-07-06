# payload-plugin-seo

shadcn/ui-themed SEO plugin for Payload CMS — an in-house replacement for
`@payloadcms/plugin-seo` + `@payloadcms/plugin-redirects`, built for shadcn-admin's UI
integration and a curated JSON-LD schema-block system.

`seoPlugin(options)` adds up to three things to your config:

1. A per-document **`meta` field group** on the collections/globals you name — SEO
   title/description, OG image, robots (noindex/nofollow), canonical URL, OG/Twitter
   fields, breadcrumb title, and a `schema` blocks field for structured data. It renders
   through a custom `.input` override with a live SERP + social-share preview and
   character counters.
2. A site-wide **`seo-settings` global** — title template, default description/OG
   image/Twitter card/locale, per-collection title/description templates, Organization
   JSON-LD, and sitemap defaults (`changefreq`/`priority`).
3. A **`redirects` collection** — `from` (unique path) → `to` (internal doc or custom
   URL) + 301/302 type, publicly readable.

It also registers a guided setup wizard at `/admin/seo-wizard` (a completeness/health
panel, Yoast/Rank-Math style) unless you turn it off.

It does not touch document slugs and ships no sitemap generator — it only stores
`sitemap.changefreq`/`sitemap.priority` defaults for your frontend to read.

## Install

```jsonc
// package.json — shadcn-ui is required at runtime even though npm marks it optional
{
  "dependencies": {
    "payload-plugin-shadcn-ui": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-shadcn-ui",
    "payload-plugin-shadcn-admin": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-shadcn-admin",
    "payload-plugin-seo": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-seo"
  }
}
```

```ts
// payload.config.ts
import { seoPlugin } from 'payload-plugin-seo'

export default buildConfig({
  plugins: [
    seoPlugin({
      collections: ['pages'],
      globals: [],
      uploadsCollection: 'media',
    }),
    // ...shadcnAdminPlugin() after this — see "Register order" below
  ],
})
```

### Register order

Register **before** `shadcnAdminPlugin` so the `meta` group / `seo-settings` global /
`redirects` collection exist when the admin plugin installs its auto views over them.
Don't co-register the official `@payloadcms/plugin-seo` / `plugin-redirects` — this
plugin's `meta` group and `redirects` collection would collide with theirs (duplicate
fields / slugs); the consumer-wins guards below skip re-adding an already-present
slug/field, but won't reconcile two competing shapes.

## Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `collections` | `string[]` | – (none) | Collection slugs that get the `meta` group injected. Also seeds the settings-global's per-collection template picker and the redirects collection's internal-target list, unless those are overridden separately. |
| `globals` | `string[]` | – (none) | Global slugs that get the `meta` group. |
| `uploadsCollection` | `string` | `'media'` | Upload-relationship target for `meta.image`, OG/Twitter/schema-block images, `seo-settings.defaultOgImage`, and `organization.logo`. |
| `fieldName` | `string` | `'meta'` | Name of the injected SEO group field. |
| `tab` | `boolean \| { label?: string }` | `false` | Puts the SEO group in a tab instead of appending at the bottom. The tab itself is unnamed, so the stored data path (`<fieldName>`) doesn't change — purely a UI grouping. Default tab label is `'SEO'`. |
| `localized` | `boolean` | `true` | Makes the injected SEO text fields localized (no-op if `config.localization` isn't set). |
| `jsonLdVirtualField` | `boolean` | `false` | Adds a read-only virtual `meta.jsonLdComputed` field that assembles the `schema` blocks into JSON-LD on `afterRead`. Off by default — the frontend is expected to call the exported `buildJsonLd` itself; never shown in the admin form regardless. |
| `settingsGlobal` | `boolean \| { slug?: string }` | `true` | Registers the `seo-settings` global (default slug `'seo-settings'`, overridable). `false` skips it. Consumer-wins: skipped if the slug already exists. |
| `redirects` | `boolean \| { slug?: string; collections?: string[]; overrides?: Partial<CollectionConfig> }` | `true` | Registers the `redirects` collection (default slug `'redirects'`). `collections` restricts which collections are selectable as internal redirect targets (defaults to `options.collections`, else every collection in config). `overrides` merges onto the generated collection — see "`redirects` overrides" below. Consumer-wins: skipped if the slug already exists. |
| `wizard` | `boolean` | `true` | Registers the setup wizard view at `/admin/seo-wizard`. Automatically skipped if `settingsGlobal` resolves to `false`. |
| `disabled` | `boolean` | `false` | Skip the whole plugin — no collections, globals, translations, or admin view added. |

### `redirects` overrides merge

`overrides.access` and `overrides.admin` are merged (spread-then-override, consumer-wins
per key); `overrides.fields` **extends** the built-in three fields (`from`/`to`/`type`)
rather than replacing them. Any other top-level key is spread wholesale. In particular,
passing `overrides.fields` adds rows — it does not delete the built-in ones.

## Structured data (`schema` blocks)

The `meta.schema` field is a Payload `blocks` field with 9 curated schema.org block
types: `article`, `product`, `faq`, `howTo`, `event`, `localBusiness`, `recipe`, `video`,
and `custom` (a raw JSON-LD escape hatch). `buildJsonLd`/`buildBreadcrumbList`/
`resolveTemplate` are dependency-free (no Payload/React imports) and exported
separately via `payload-plugin-seo/schema` for use in a non-Payload frontend bundle
(Astro/Workers) without pulling in the Payload-dependent package root.

## Peer dependencies

```
@payloadcms/next             >=3.84 <3.90
@payloadcms/translations     >=3.84 <3.90
@payloadcms/ui               >=3.84 <3.90
next                          >=15 <17
payload                       >=3.84 <3.90
payload-plugin-shadcn-admin   >=0.0.1  (optional in package.json, required at runtime)
payload-plugin-shadcn-ui      >=0.0.1  (optional in package.json, required at runtime)
radix-ui                      ^1.4.3
react                          >=19 <20
react-dom                      >=19 <20
```

`shadcn-admin` and `shadcn-ui` are marked `peerDependenciesMeta.optional` so installing
this package alone doesn't hard-fail, but they're load-bearing regardless: the `meta`
group's `.input` override and the wizard launcher render through shadcn-admin's
group-override mechanism, and the wizard view imports `extractCollection`/`ViewShell`
directly from shadcn-ui. Always pin both alongside this package.

## Exports

- `payload-plugin-seo` — `seoPlugin`; `seoField` (+ `SeoFieldOptions`); `SeoPluginConfig`
  type; `buildJsonLd`, `SchemaBlock`, `OrganizationData`, `BuildJsonLdOptions`;
  `buildBreadcrumbList`, `BreadcrumbItem`; `resolveTemplate`, `SEO_TEMPLATE_TOKENS`,
  `SeoTemplateToken`, `TemplateVars`.
- `payload-plugin-seo/client` — `SeoGroupInput` (the `.input` override component).
- `payload-plugin-seo/rsc` — `SeoWizardView` (registered by string path, not direct
  import — resolved slugs are passed via `config.custom['plugin-seo']` since the plugin
  can't pass props to a string-path view directly).
- `payload-plugin-seo/types` — `SeoPluginConfig` type only.
- `payload-plugin-seo/schema` — `buildJsonLd`, `buildBreadcrumbList`, `resolveTemplate` +
  types, with no Payload/React dependency — safe for a non-Payload frontend bundle.

## Notes

- The setup wizard reads/writes `payload.config.localization.defaultLocale` only — its
  completeness panel doesn't attempt a per-locale roll-up.
- The `seo-settings` global's tabs (Defaults / Meta patterns / Organization / Sitemap)
  are deliberately unnamed, same reasoning as the `tab` option above: reorganizing the
  UI must never change the stored data path.
- Global `labels`/`admin.description` on `seo-settings` and `redirects` use static
  strings rather than translation functions — Payload's client-config builder doesn't
  resolve function-form labels/descriptions for **globals** the way it does for
  collections/fields, so a function there throws client-side.

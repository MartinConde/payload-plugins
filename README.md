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

## Develop

```bash
pnpm install
pnpm build        # builds all packages
pnpm typecheck
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the pre-commit checklist and
[`RELEASING.md`](RELEASING.md) for cutting a new tag.

## Install in a Payload project (from git, pnpm only)

These are private and not on npm. Install a single package from a subdirectory using
pnpm's `path:` git syntax (pnpm v9+; npm/Yarn do not support this). Always pin a tag.

```jsonc
// package.json — installing shadcn-admin + seo + menus (shadcn-ui is a required peer of all three)
{
  "dependencies": {
    "payload-plugin-shadcn-ui": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-shadcn-ui",
    "payload-plugin-shadcn-admin": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-shadcn-admin",
    "payload-plugin-seo": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-seo",
    "payload-plugin-menus": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-menus"
  }
}
```

`payload-plugin-shadcn-ui` is a **required** (non-optional) peer of `shadcn-admin`. `seo`,
`menus`, and `products` each declare it as an *optional* peer too (so the install itself
won't fail without it), but their custom field UIs (SERP preview, tree editor,
print-area designer) render through it — it's required at runtime regardless. `products`
additionally has an optional-but-runtime-required peer on `shadcn-admin` for its doc-view
integration. In practice: always pin `shadcn-ui` alongside any of these four packages,
and pin `shadcn-admin` too if you're using `products`.

Each package's built `dist/` is committed to git; there is no `prepare`/build-on-install
step — the install just fetches the tag's tree as-is.

Since the repo is private, installs use your local git auth (SSH key or credential
helper / a PAT in CI).

# payload-plugins

In-house [Payload CMS](https://payloadcms.com) plugins, developed together in one pnpm
workspace. Each package is published/installed independently.

| Package | Description |
| --- | --- |
| [`payload-plugin-shadcn-admin`](packages/payload-plugin-shadcn-admin) | shadcn/ui-themed admin UI (base — the others depend on it). |
| [`payload-plugin-seo`](packages/payload-plugin-seo) | Per-document meta + SERP preview, SEO defaults global, redirects collection. |
| [`payload-plugin-menus`](packages/payload-plugin-menus) | dnd-kit nested-tree menu builder. |

## Develop

```bash
pnpm install
pnpm build        # builds all packages
pnpm typecheck
```

## Install in a Payload project (from git, pnpm only)

These are private and not on npm. Install a single package from a subdirectory using
pnpm's `path:` git syntax (pnpm v9+; npm/Yarn do not support this). Always pin a tag.

```jsonc
// package.json
{
  "dependencies": {
    "payload-plugin-shadcn-admin": "github:MartinConde/payload-plugins#v0.1.0&path:/packages/payload-plugin-shadcn-admin",
    "payload-plugin-seo": "github:MartinConde/payload-plugins#v0.1.0&path:/packages/payload-plugin-seo",
    "payload-plugin-menus": "github:MartinConde/payload-plugins#v0.1.0&path:/packages/payload-plugin-menus"
  }
}
```

`seo` and `menus` both require `payload-plugin-shadcn-admin` (peer) — install it
alongside them. The packages build on install via their `prepare` hook (SWC + tsc).

Since the repo is private, installs use your local git auth (SSH key or credential
helper / a PAT in CI).

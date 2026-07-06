# payload-plugin-shadcn-ui

shadcn/ui primitives + doc-form extension hooks, used by `payload-plugin-shadcn-admin`
and directly by the feature plugins (`menus`, `products`, `seo`). This is the **base**
package of the stack — every other plugin here depends on it.

Unlike the other packages, this one exports no `xPlugin(options)` function. It's a plain
component/hook library: nothing here registers a collection, global, or config hook. It
exists so a feature plugin's custom field UI (the SEO wizard, the menu tree editor, the
product print-area designer) can render shadcn primitives and read/write the surrounding
doc form **without** taking a runtime dependency on `payload-plugin-shadcn-admin` itself.

## Install

```jsonc
// package.json
{
  "dependencies": {
    "payload-plugin-shadcn-ui": "github:MartinConde/payload-plugins#v0.0.1&path:/packages/payload-plugin-shadcn-ui"
  }
}
```

```css
/* your Tailwind entry file, e.g. src/app/(payload)/custom.css */
@import 'payload-plugin-shadcn-ui/themes.css'; /* design tokens (light/dark × minimal/vibrant) */
@import 'payload-plugin-shadcn-ui/styles.css'; /* Payload-chrome overrides */

/* Tailwind v4 can't resolve bare specifiers for @source (only @import) —
   point it at the dist folder directly so classes used inside the vendored
   components survive the content scan. Depth is coupled to install mode:
   see the note in cf-payload-astro-starter's custom.css if you're unsure. */
@source '../../../../../node_modules/payload-plugin-shadcn-ui/dist';
```

If you're installing `shadcn-admin` and/or `seo`/`menus`/`products` alongside this
package, add one `@source` line per installed plugin — see the root
[`payload-plugins/README.md`](../../README.md) and each plugin's own README.

## What's in it

### shadcn/ui primitives (vendored)

Avatar, Badge, Breadcrumb, Button, Calendar, Card, Checkbox, Collapsible, Command,
Dialog, DropdownMenu, Input, Label, Popover, RadioGroup, Resizable, Select, Separator,
Sheet, Sidebar (incl. `useSidebar`), Skeleton, Table, Tabs, Textarea, Tooltip — one file
per component under `src/ui/`, rebuilt via `shadcn@latest` to stay current. Deliberately
**excluded**: `FieldInput`, `SearchableSelect`, `UploadFieldInput` — those stay in
`payload-plugin-shadcn-admin` because they depend on bridge-internal hooks (drawer
state, multipart upload, server-function rebuild) that would pull in a runtime
dependency on the admin package.

### Shells

- `ViewShell` / `ViewHeader` (+ `Crumb` type) — sidebar-trigger + breadcrumb header +
  padded content slot, for a custom post-auth admin view.
- `AuthShell` — centered-card shell for pre-auth views (login, create-first-user,
  forgot-password, logout, unauthorized), including the CSS neutralization needed
  inside Payload's `MinimalTemplate` wrapper.

### Doc-form extension hooks

The actual integration contract a custom field `.input` override uses to read/write the
surrounding Payload doc form. A field config can point at your component via
`custom: { 'plugin-shadcn-admin': { input: MyComponent } }`; inside it, these hooks work
whether or not `payload-plugin-shadcn-admin`'s bridge is mounted — each returns a safe
default (`null`/no-op) with no provider, so override components stay null-check-free:

| Export | Purpose |
| --- | --- |
| `useDocFormValues()` | The whole doc-root value tree. |
| `useDocFormFieldValue(path)` | One field by dotted path, auto-projecting locale-keyed leaves. |
| `useDocFormSetValue()` | Write to *any* path in the doc form, not just your own field — e.g. the products print-area editor reads a sibling `mockup` upload's value this way. |
| `useDocIdentity()` | `{ collectionSlug, documentId }` of the doc being edited — e.g. so a relationship picker can exclude the current doc from self-reference. |
| `useActiveLocale()` | The bridge's active locale, for slicing individually-localized subfield values. |
| `usePageBuilder()` | `{ selectedBlockId, setSelectedBlockId }`, shared between Live Preview's panel and block-settings panel. |

The providers (`DocFormValuesProvider`, `DocIdentityProvider`, `LocaleProvider`,
`PageBuilderProvider`) are mounted once, by `payload-plugin-shadcn-admin`'s doc-form
bridge — this package only defines the contract, it never mounts them itself.

### RSC → client extraction

`extractCollection` / `extractGlobal` (+ `extractField`, `stringifyLabel`, and the
`Extracted*` types) project a Payload collection or global config into a plain
serializable shape that can cross the RSC → client boundary — used by every auto view
in `payload-plugin-shadcn-admin` and by `payload-plugin-seo`'s setup wizard. Field
extraction only carries the `'plugin-shadcn-admin'` custom namespace across, so a
foreign plugin's non-serializable `custom` data doesn't blow up serialization.

### `FieldInputProps` (+ friends)

Type-only export (`FieldInputField`, `FieldInputOption`, `FieldInputProps`,
`FieldInputTFunction`) that mirrors the admin bridge's runtime `.input`-override prop
shape, loosened so a feature plugin can type its own override component without a
runtime dependency on `payload-plugin-shadcn-admin`.

## Peer dependencies

```
@payloadcms/translations >=3.84 <3.90
@payloadcms/ui            >=3.84 <3.90
next                       >=15 <17
payload                    >=3.84 <3.90
radix-ui                   ^1.4.3
react                       >=19 <20
react-dom                   >=19 <20
```

All required — none are marked optional in this package's own `peerDependenciesMeta`.
(Consumers of `seo`/`menus`/`products` may see `payload-plugin-shadcn-ui` listed as an
*optional* peer in **those** packages' `package.json` — that's about their own install
not hard-failing without it, not about this package's requirements. It's required at
runtime regardless, since their custom field UIs render through it.)

## Exports

- `payload-plugin-shadcn-ui` — everything above: primitives, shells, doc-form hooks +
  providers, `extractCollection`/`extractGlobal`, `FieldInputProps` types, `cn`,
  `useIsMobile`.
- `payload-plugin-shadcn-ui/styles.css` — Payload-chrome overrides.
- `payload-plugin-shadcn-ui/themes.css` — design tokens (light/dark × minimal/vibrant).

There's no `/client` or `/rsc` subpath — everything lives on the single main entry.

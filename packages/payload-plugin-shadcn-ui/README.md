# payload-plugin-shadcn-ui

shadcn/ui primitives, view shells, and doc-form extension hooks for Payload CMS — the
**base** package every other plugin here depends on. Not a Payload plugin itself (no
`xPlugin()` function): it's a component/hook library, and it's where **all CSS** for the
plugin stack ships (`themes.css` + `styles.css`).

```jsonc
"payload-plugin-shadcn-ui": "github:MartinConde/payload-plugins#v0.1.0&path:/packages/payload-plugin-shadcn-ui"
```

Full docs (CSS/`@source` wiring, primitives list, doc-form hooks, extraction utils,
peers): <https://cf-payload-astro-starter-docs.holy-dawn-2337.workers.dev/plugins/shadcn-ui/>
(and `/plugins/admin-integration/` for the CSS setup) — source in
[`cf-payload-astro-starter`](https://github.com/MartinConde/cf-payload-astro-starter) →
`apps/docs/src/content/docs/`.

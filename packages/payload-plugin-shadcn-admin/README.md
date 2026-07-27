# payload-plugin-shadcn-admin

Reusable shadcn/ui admin chrome for Payload CMS — auto list/doc/global/versions views,
nav sidebar, auth views, dashboard, and a server-driven DataTable, all opt-in via
`shadcnAdminPlugin()` options. Register it **after** any feature plugins whose
collections it should auto-view.

```jsonc
"payload-plugin-shadcn-admin": "github:MartinConde/payload-plugins#v0.1.0&path:/packages/payload-plugin-shadcn-admin"
```

Requires `payload-plugin-shadcn-ui` alongside — this package ships **no CSS** of its
own; all styles come from shadcn-ui.

Full docs (setup, every option, list/doc view features, dashboard widgets):
<https://cf-payload-astro-starter-docs.holy-dawn-2337.workers.dev/plugins/shadcn-admin/> —
source in [`cf-payload-astro-starter`](https://github.com/MartinConde/cf-payload-astro-starter)
→ `apps/docs/src/content/docs/plugins/shadcn-admin/`.

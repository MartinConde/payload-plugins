# payload-plugin-products

Product catalog for Payload CMS with a Fabric.js multi-view, multi-color print-area
designer — `products`, `print-templates`, and `color-swatches` collections, with
mm-based aspect-locked print rects for downstream DPI checks.

```jsonc
"payload-plugin-products": "github:MartinConde/payload-plugins#v0.1.0&path:/packages/payload-plugin-products"
```

Requires `payload-plugin-shadcn-ui` and `payload-plugin-shadcn-admin` alongside
(optional peers on paper, required at runtime for the designer UI).

Full docs (options, the `views[].colorMockups[]` data model, the v0.1 → v0.2 data-shape
migration via the `/migrations` export):
<https://cf-payload-astro-starter-docs.holy-dawn-2337.workers.dev/plugins/products/> —
source in [`cf-payload-astro-starter`](https://github.com/MartinConde/cf-payload-astro-starter)
→ `apps/docs/src/content/docs/plugins/products.md`.

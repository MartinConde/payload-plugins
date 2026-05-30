# payload-plugin-products

Catalog products for Payload CMS with a multi-view, multi-color print-area
designer. A single product holds all of its views (front / back / sleeve / …)
and color variants in one document; print-area placements are shared across
colors of a view by default and the editor broadcasts edits to every unlocked
row, so adding a colour or view never means re-mapping a matrix of variations.

The print-area editor is Fabric.js, mounted as a custom Payload UI field;
print rects are aspect-locked to a physical (mm) size for downstream DPI
checks.

> **Stability:** v0.2 is the first multi-view/multi-color release. The data
> shape changed substantially from v0.1; a forward-only migration helper is
> shipped — see [Migration](#migration-v011--v020).

## Concepts

| Collection | Purpose |
|---|---|
| `color-swatches` | Global colour palette. Each swatch carries a hex value and an optional uploaded swatch image. Products relate to swatches via `colors[]`. |
| `print-templates` | Reusable physical print sizes (`T-Shirt Front A4`, …) with `widthMm` / `heightMm` / `bleedMm` / `minDpi`. Views can pick a template or specify custom mm. |
| `products` | The product itself. Holds `colors[]`, `views[]`, and per-view `colorMockups[]` (one row per colour with mockup + transform + placement). |

`views[].colorMockups[]` is the heart of v0.2: one row per `(view, color)`
combination, each with its own mockup upload, `mockupTransform`,
`printAreaPlacement`, and a `placementLocked` flag. With the flag off (the
default), placement edits broadcast across every unlocked row of the same
view. With it on, the row keeps its own framing.

## Install

```ts
// payload.config.ts
import { productsPlugin } from 'payload-plugin-products'

export default buildConfig({
  plugins: [
    productsPlugin({
      mediaCollectionSlug: 'media',
      // Defaults below — override only if your project uses other slugs.
      // slug: 'products',
      // colorSwatchesSlug: 'color-swatches',
      // printTemplatesSlug: 'print-templates',
      // defaultViewPresets: ['Front', 'Back', 'Left', 'Right', 'Sleeve'],
    }),
  ],
})
```

Register **before** `payload-plugin-shadcn-admin` so the auto list/doc views
mount on top of the products collection.

## Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `slug` | `string` | `'products'` | Products collection slug. |
| `mediaCollectionSlug` | `string` | `'media'` | Upload-relationship target for mockups and swatch images. |
| `colorSwatchesSlug` | `string` | `'color-swatches'` | Slug for the colour palette collection the plugin auto-creates. |
| `printTemplatesSlug` | `string` | `'print-templates'` | Slug for the reusable physical-size collection the plugin auto-creates. |
| `defaultViewPresets` | `string[]` | `['Front','Back','Left','Right','Sleeve']` | Suggestion list shown by the "Add view" picker. Free text remains allowed. |
| `overrides` | `Partial<CollectionConfig>` | – | Forwarded to the products collection; consumer-wins on slug conflicts. |
| `disabled` | `boolean` | `false` | Skip the whole plugin (no collections, no translations). |

## Migration v0.1.1 → v0.2.0

v0.1 stored a single mockup and a flat `printAreas` JSON blob per product.
v0.2 splits that into `colors[]` + `views[].colorMockups[]`. The migration
helper takes each legacy product, seeds a single `Default` colour-swatch, and
collapses the old data into one `Front` view with one colour row.

The helper is **idempotent**: products that already have a non-empty
`views[]` are skipped and counted.

### Step 1 — generate the schema migration first

```bash
pnpm payload migrate:create
```

Payload will emit DDL that creates the new tables (`color_swatches`,
`print_templates`, the new `products_views` / `products_views_color_mockups`
sub-tables) **and** drops the legacy `products.mockup_id` /
`products.print_areas` columns in the same file.

> **Hand-edit before committing.** Remove the
> `ALTER TABLE products DROP COLUMN mockup_id` and
> `ALTER TABLE products DROP COLUMN print_areas` statements from that
> generated file. The data migration in step 2 needs to read those columns;
> dropping them in the same pass would erase the legacy data before we copy
> it.

### Step 2 — add the data migration

Create a follow-up migration file with a higher timestamp:

```ts
// src/migrations/<timestamp>_products_v0_2.ts
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-d1-sqlite'
import { migrateProductsV0_1ToV0_2 } from 'payload-plugin-products/migrations'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const result = await migrateProductsV0_1ToV0_2(payload)
  payload.logger.info(
    `[products-v0.2] migrated=${result.migrated} skipped=${result.skipped}`,
  )
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // Forward-only.
}
```

Register it in `src/migrations/index.ts` after the schema migration from step
1. The helper accepts an options bag (`defaultColorName`, `defaultColorHex`,
`productsSlug`, `colorSwatchesSlug`) — pass overrides if your slugs aren't
the defaults.

The return shape is:

```ts
{ migrated: number; skipped: number; defaultColorId: string }
```

(The original plan documented `{ migrated, defaultColorId }`; `skipped` is
additive and won't break destructuring callers.)

### Step 3 — drop the legacy columns in a later release

Once every environment has run step 2 successfully, generate one more
schema migration that drops the legacy columns and commit it as-is. Phase 5
deliberately leaves this for a follow-up patch so there is no scenario
where the data migration runs against a DB whose legacy columns were
dropped one statement earlier in the same file.

## Out of scope (Phase 6+)

- Sizes / material / fit variant axes
- Per-variant SKUs, stock, price, weight, barcodes
- Customer-side designer (text / image / clipart placement)
- AI features (background removal, image gen)
- 3D mockups
- Print-file PDF / PNG export with bleed and DPI checks
- Cart / checkout / order integration
- Storefront / Astro UI

See the master plan (`we-have-a-payload-unified-kahn.md`) for the long
roadmap.

## Known limitations (0.2.0)

- Destructive operations (remove view, remove colour) use Payload's default
  array-row delete confirmation. A bespoke confirm dialog awaits a `Dialog`
  re-export from `payload-plugin-shadcn-admin/client` in 0.2.1.
- `snapPlacementsToAspect` uses the active row's natural pixel aspect as a
  proxy for every unlocked row — accurate when colour mockups share aspect,
  approximate when they don't. Per-row fan-out is planned for 0.2.1.
- The Add-Area picker in the toolbar is a single button; the two-step
  preset / custom-mm flow lives inside the Print Areas tab.

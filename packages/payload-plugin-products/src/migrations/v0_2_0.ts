/* Data migration v0.1.1 → v0.2.0.
 *
 *   v0.1.1 stored a single mockup + flat printAreas blob per product:
 *     products.mockup_id  → media id
 *     products.print_areas → JSON `{ naturalWidth, naturalHeight, areas[],
 *                                    mockupTransform }`
 *
 *   v0.2.0 splits the same data across:
 *     products.colors[]               → relationship → color-swatches (Default)
 *     products.views[]                → array, one row per view (Front…)
 *       views[].colorMockups[]        → array, one row per (view, color)
 *         row.mockup                  → upload (was products.mockup)
 *         row.mockupTransform         → MockupTransform (was inside printAreas)
 *         row.printAreaPlacement      → PrintAreaPlacement[] (was printAreas.areas)
 *
 *   Strategy: read legacy columns via raw SQL so a typed read (which would
 *   return undefined post-schema-drop) can't fool us into "already migrated".
 *   Idempotency check is a separate typed read against the new schema.
 *
 *   Forward-only; legacy fields are not preserved after the consumer's
 *   follow-up cleanup migration drops the columns.
 */

import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'

import {
  IDENTITY_MOCKUP_TRANSFORM,
  normalizeMockupTransform,
  normalizePlacements,
  refToId,
  type ColorMockupRow,
  type PrintAreaPlacement,
  type ViewRow,
} from '../ui/printArea.js'

export interface MigrateProductsV0_2Options {
  /** Display name for the seeded fallback color. Default `'Default'`. */
  defaultColorName?: string
  /** Hex value for the seeded fallback color. Default `'#cccccc'`. */
  defaultColorHex?: string
  /** Products collection slug. Default `'products'`. */
  productsSlug?: string
  /** Color-swatches collection slug. Default `'color-swatches'`. */
  colorSwatchesSlug?: string
}

export interface MigrateProductsV0_2Result {
  /** Number of products updated by this run. */
  migrated: number
  /** Number of products already on the v0.2 shape (skipped). */
  skipped: number
  /** ID of the seeded / reused fallback color-swatch. */
  defaultColorId: string
}

type LegacyRow = {
  id: string | number
  mockup_id: string | number | null
  print_areas: string | Record<string, unknown> | null
}

const stripPhysicalDims = (raw: unknown): unknown => {
  if (!raw || typeof raw !== 'object') return raw
  const { widthMm: _wm, heightMm: _hm, ...rest } = raw as Record<string, unknown>
  return rest
}

/** Find-or-create the default color-swatch. Returns its id. */
async function ensureDefaultColor(
  payload: Payload,
  colorSwatchesSlug: string,
  name: string,
  hex: string,
): Promise<string> {
  const existing = await payload.find({
    collection: colorSwatchesSlug,
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const hit = existing.docs[0]
  if (hit && hit.id != null) return String(hit.id)
  const created = await payload.create({
    collection: colorSwatchesSlug,
    data: { name, hex },
    overrideAccess: true,
  })
  return String(created.id)
}

/**
 * Migrate legacy v0.1.1 products into the v0.2.0 shape (one Front view, one
 * Default color). Idempotent: products already carrying a non-empty `views[]`
 * are skipped.
 *
 * The data migration relies on the legacy `products.mockup_id` and
 * `products.print_areas` columns still being present. The consumer must
 * hand-edit any auto-generated schema migration to defer their drop until
 * after this data migration has run — see the plugin README for the exact
 * procedure.
 */
export async function migrateProductsV0_1ToV0_2(
  payload: Payload,
  options: MigrateProductsV0_2Options = {},
): Promise<MigrateProductsV0_2Result> {
  const productsSlug = options.productsSlug ?? 'products'
  const colorSwatchesSlug = options.colorSwatchesSlug ?? 'color-swatches'
  const defaultColorName = options.defaultColorName ?? 'Default'
  const defaultColorHex = options.defaultColorHex ?? '#cccccc'

  const defaultColorId = await ensureDefaultColor(
    payload,
    colorSwatchesSlug,
    defaultColorName,
    defaultColorHex,
  )

  // Raw SQL read of the LEGACY shape. If `mockup_id` / `print_areas` were
  // already dropped by an over-eager schema migration, this throws and we
  // surface the error — better than silently skipping every doc.
  //
  // Column-name assumption: Payload's drizzle-backed adapters snake_case
  // field names. A `relationship` field named `mockup` becomes the FK column
  // `mockup_id`; a `json` field named `printAreas` becomes `print_areas`.
  // Validated against the v0.1.1 collection definition; not against a snapshot
  // because cf-payload-astro-starter never tracked the products table in a
  // committed schema migration. If a consumer customised the field names,
  // pass the resolved column names via options in a future revision.
  //
  // `payload.db` is typed as the generic `DatabaseAdapter` (intentionally
  // narrow) but every drizzle-backed adapter exposes a `.drizzle` field with
  // `.all` (SELECT) / `.run` (DML) / `.execute`. Cast through `unknown` so
  // this stays adapter-agnostic. We use `.all()` here because some adapters
  // (notably D1) treat `.run()` as DML-only and return `{success, meta}` with
  // no rows for a SELECT.
  const drizzle = (
    payload.db as unknown as {
      drizzle: {
        all: (q: unknown) => Promise<unknown>
        run?: (q: unknown) => Promise<unknown>
        execute?: (q: unknown) => Promise<unknown>
      }
    }
  ).drizzle
  if (
    !drizzle ||
    (typeof drizzle.all !== 'function' &&
      typeof drizzle.execute !== 'function' &&
      typeof drizzle.run !== 'function')
  ) {
    throw new Error(
      'migrateProductsV0_1ToV0_2 requires a Drizzle-backed database adapter ' +
        '(payload.db.drizzle exposing .all/.execute/.run). The configured ' +
        'adapter does not expose one — run this migration only on SQLite/Postgres.',
    )
  }
  const tableIdent = sql.raw(`"${productsSlug.replace(/"/g, '""')}"`)
  const query = sql`SELECT id, mockup_id, print_areas FROM ${tableIdent}`
  const result =
    typeof drizzle.all === 'function'
      ? await drizzle.all(query)
      : typeof drizzle.execute === 'function'
        ? await drizzle.execute(query)
        : await drizzle.run!(query)
  const rawRows =
    (result as { rows?: unknown[]; results?: unknown[] }).rows ??
    (result as { results?: unknown[] }).results ??
    (Array.isArray(result) ? result : [])
  const rows = (Array.isArray(rawRows) ? rawRows : []) as LegacyRow[]

  let migrated = 0
  let skipped = 0

  for (const row of rows) {
    const productId = row?.id
    if (productId == null) continue

    // Idempotency check via the new schema's typed read.
    const fresh = await payload.findByID({
      collection: productsSlug,
      id: productId,
      depth: 0,
      overrideAccess: true,
    })
    const existingViews = (fresh as { views?: unknown }).views
    if (Array.isArray(existingViews) && existingViews.length > 0) {
      skipped += 1
      continue
    }

    const legacyPrintAreasRaw = row.print_areas
    let legacyPrintAreas: Record<string, unknown> | null = null
    if (typeof legacyPrintAreasRaw === 'string' && legacyPrintAreasRaw.length > 0) {
      try {
        legacyPrintAreas = JSON.parse(legacyPrintAreasRaw)
      } catch {
        legacyPrintAreas = null
      }
    } else if (legacyPrintAreasRaw && typeof legacyPrintAreasRaw === 'object') {
      legacyPrintAreas = legacyPrintAreasRaw as Record<string, unknown>
    }

    const legacyAreas = Array.isArray((legacyPrintAreas as { areas?: unknown[] } | null)?.areas)
      ? ((legacyPrintAreas as { areas: unknown[] }).areas as unknown[])
      : []
    const firstArea = legacyAreas[0] as Record<string, unknown> | undefined
    const widthMm =
      typeof firstArea?.widthMm === 'number' && firstArea.widthMm > 0
        ? firstArea.widthMm
        : undefined
    const heightMm =
      typeof firstArea?.heightMm === 'number' && firstArea.heightMm > 0
        ? firstArea.heightMm
        : undefined

    const placement: PrintAreaPlacement[] = normalizePlacements(
      legacyAreas.map(stripPhysicalDims),
    )
    const mockupTransform = normalizeMockupTransform(
      (legacyPrintAreas as { mockupTransform?: unknown } | null)?.mockupTransform,
    )

    const colorRow: ColorMockupRow = {
      id: crypto.randomUUID(),
      color: defaultColorId,
      mockup: refToId(row.mockup_id),
      mockupTransform: mockupTransform ?? { ...IDENTITY_MOCKUP_TRANSFORM },
      printAreaPlacement: placement,
      placementLocked: false,
    }

    const view: ViewRow = {
      id: crypto.randomUUID(),
      name: 'Front',
      printAreaSource: 'custom',
      widthMm,
      heightMm,
      colorMockups: [colorRow],
    }

    await payload.update({
      collection: productsSlug,
      id: productId,
      data: {
        colors: [defaultColorId],
        views: [view],
      } as never,
      overrideAccess: true,
    })

    migrated += 1
  }

  return { migrated, skipped, defaultColorId }
}

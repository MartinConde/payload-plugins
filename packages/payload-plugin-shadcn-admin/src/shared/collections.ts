import type { SidebarCollectionItem } from '../features/nav/CollectionsSidebarGroup.js'

/* Subset of Payload's SanitizedCollectionConfig we read — kept structural so
   the helpers don't drag in a full Payload type dependency at the call site. */
type PayloadCollectionLike = {
  slug: string
  labels?: { singular?: unknown; plural?: unknown } | null
  /* We only inspect admin.hidden === true; leaving the field's shape unknown
     keeps Payload's real (stricter) callback signature assignable here. */
  admin?: { hidden?: unknown } | null
}

type PayloadGlobalLike = {
  slug: string
  label?: unknown
  admin?: { hidden?: unknown } | null
}

type PayloadConfigLike = {
  collections?: ReadonlyArray<PayloadCollectionLike>
  globals?: ReadonlyArray<PayloadGlobalLike>
}

function stringifyLabel(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    // Payload localizes labels as { [locale]: string }. Pick the first string value.
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (typeof v === 'string') return v
    }
  }
  return null
}

function titleCase(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/* Map a Payload config's collections to the shape CollectionsSidebarGroup
   expects. Hidden collections (admin.hidden === true) are skipped. The
   function-form of admin.hidden is treated as visible — call sites that want
   per-user filtering should pass already-filtered collections. */
export function collectionsFromPayloadConfig(
  config: PayloadConfigLike,
): SidebarCollectionItem[] {
  const collections = config.collections ?? []
  return collections
    .filter((c) => c.admin?.hidden !== true)
    .map((c) => ({
      slug: c.slug,
      label: stringifyLabel(c.labels?.plural) ?? titleCase(c.slug),
    }))
}

/* Companion of collectionsFromPayloadConfig for globals. Hidden globals
   (admin.hidden === true) are skipped. */
export function globalsFromPayloadConfig(
  config: PayloadConfigLike,
): SidebarCollectionItem[] {
  const globals = config.globals ?? []
  return globals
    .filter((g) => g.admin?.hidden !== true)
    .map((g) => ({
      slug: g.slug,
      label: stringifyLabel(g.label) ?? titleCase(g.slug),
    }))
}

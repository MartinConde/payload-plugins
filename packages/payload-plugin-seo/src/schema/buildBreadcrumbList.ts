/* Pure, Node-safe helper: build a schema.org BreadcrumbList from a trail the
   frontend already computes (it owns routing/hierarchy). No Payload imports. */

export type BreadcrumbItem = {
  /** Visible label for this crumb (use `meta.breadcrumbTitle` to override). */
  name: string
  /** Absolute or site-relative URL of this crumb. */
  url?: string
}

/**
 * Build a `BreadcrumbList` JSON-LD node. Positions are 1-based in trail order.
 * The last item conventionally omits `url` (the current page), but either form
 * is accepted.
 */
export function buildBreadcrumbList(
  items: BreadcrumbItem[] | null | undefined,
): Record<string, unknown> {
  const list = Array.isArray(items) ? items : []
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  }
}

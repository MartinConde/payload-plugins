/* Pure, Node-safe mapper: curated `meta.schema` blocks → schema.org JSON-LD
   nodes ready to emit as <script type="application/ld+json">.

   No Payload / React imports — this is shared verbatim by the optional
   `meta.jsonLdComputed` virtual field (server, afterRead) and the Astro
   frontend. Keep it dependency-free.

   Each stored block carries a `blockType` discriminator (the block slug) plus
   its own fields. We map only the curated types defined in
   `fields/schemaBlocks.ts`; an unknown `blockType` is skipped. Localized text
   fields are expected to arrive already resolved to a single locale (read the
   document with a `locale`); a raw `{ [locale]: value }` object falls back to
   empty. Upload fields (`image`) may be a string URL, a populated object with a
   `url`, or a bare id — only the first two yield a value (read with enough
   `depth` to populate). */

export type SchemaBlock = {
  blockType?: string
  [key: string]: unknown
}

export type OrganizationData = {
  name?: string
  url?: string
  /** Populated logo upload (object with `url`) or a URL string. */
  logo?: unknown
  /** `sameAs` social profiles, as stored by the settings global. */
  sameAs?: Array<{ url?: string }> | string[]
}

export type BuildJsonLdOptions = {
  /** When provided, an Organization node is prepended (site-wide identity). */
  organization?: OrganizationData
}

/** schema.org context attached to every top-level node we build. */
const CONTEXT = 'https://schema.org'

/** Reads a possibly-localized leaf as a plain string. */
function str(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw || undefined
  if (typeof raw === 'number') return String(raw)
  return undefined
}

/** Resolves an upload value (URL string | populated object | id) to a URL. */
function imageUrl(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw || undefined
  if (raw && typeof raw === 'object' && 'url' in (raw as object)) {
    const u = (raw as { url?: unknown }).url
    return typeof u === 'string' ? u : undefined
  }
  return undefined
}

/** Recursively drops undefined / null / '' / empty arrays / empty objects. */
function prune<T>(value: T): T | undefined {
  if (value == null || value === '') return undefined
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined)
    return (arr.length ? arr : undefined) as unknown as T
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = prune(v)
      if (cleaned !== undefined) out[k] = cleaned
    }
    // Keep objects that only carry an @type if they have at least one more key.
    const keys = Object.keys(out)
    const meaningful = keys.filter((k) => k !== '@type' && k !== '@context')
    return (meaningful.length ? out : undefined) as unknown as T
  }
  return value
}

/** schema.org enum URL helper (e.g. `InStock` → `https://schema.org/InStock`). */
const enumUrl = (v: unknown): string | undefined =>
  typeof v === 'string' && v ? `${CONTEXT}/${v}` : undefined

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function organizationNode(org: OrganizationData): Record<string, unknown> {
  const sameAs = arr(org.sameAs)
    .map((s) => (typeof s === 'string' ? s : str((s as { url?: unknown })?.url)))
    .filter(Boolean)
  return {
    '@type': 'Organization',
    name: str(org.name),
    url: str(org.url),
    logo: imageUrl(org.logo),
    sameAs: sameAs.length ? sameAs : undefined,
  }
}

/** Maps a single curated block to a JSON-LD node (without @context). */
function blockNode(b: SchemaBlock): Record<string, unknown> | undefined {
  switch (b.blockType) {
    case 'article':
      return {
        '@type': str(b.articleType) ?? 'Article',
        headline: str(b.headline),
        description: str(b.description),
        image: imageUrl(b.image),
        datePublished: str(b.datePublished),
        dateModified: str(b.dateModified),
        author: str(b.authorName)
          ? { '@type': 'Person', name: str(b.authorName) }
          : undefined,
      }
    case 'product':
      return {
        '@type': 'Product',
        name: str(b.name),
        image: imageUrl(b.image),
        description: str(b.description),
        sku: str(b.sku),
        brand: str(b.brand)
          ? { '@type': 'Brand', name: str(b.brand) }
          : undefined,
        offers:
          b.price != null
            ? {
                '@type': 'Offer',
                price: b.price,
                priceCurrency: str(b.priceCurrency),
                availability: enumUrl(b.availability),
              }
            : undefined,
        aggregateRating:
          b.ratingValue != null
            ? {
                '@type': 'AggregateRating',
                ratingValue: b.ratingValue,
                reviewCount: b.reviewCount,
              }
            : undefined,
      }
    case 'faq':
      return {
        '@type': 'FAQPage',
        mainEntity: arr(b.questions).map((q: any) => ({
          '@type': 'Question',
          name: str(q?.question),
          acceptedAnswer: { '@type': 'Answer', text: str(q?.answer) },
        })),
      }
    case 'howTo':
      return {
        '@type': 'HowTo',
        name: str(b.name),
        totalTime: str(b.totalTime),
        tool: arr(b.tools).map((t: any) => str(t?.name)),
        supply: arr(b.supplies).map((s: any) => str(s?.name)),
        step: arr(b.steps).map((s: any) => ({
          '@type': 'HowToStep',
          name: str(s?.name),
          text: str(s?.text),
          image: imageUrl(s?.image),
        })),
      }
    case 'event':
      return {
        '@type': 'Event',
        name: str(b.name),
        startDate: str(b.startDate),
        endDate: str(b.endDate),
        eventStatus: enumUrl(b.eventStatus),
        location: str(b.locationName)
          ? {
              '@type': 'Place',
              name: str(b.locationName),
              address: str(b.locationAddress),
            }
          : undefined,
        offers:
          b.price != null
            ? {
                '@type': 'Offer',
                price: b.price,
                priceCurrency: str(b.priceCurrency),
                url: str(b.url),
              }
            : undefined,
      }
    case 'localBusiness': {
      const address = b.address as Record<string, unknown> | undefined
      return {
        '@type': 'LocalBusiness',
        name: str(b.name),
        image: imageUrl(b.image),
        telephone: str(b.telephone),
        priceRange: str(b.priceRange),
        address: address
          ? {
              '@type': 'PostalAddress',
              streetAddress: str(address.streetAddress),
              addressLocality: str(address.addressLocality),
              addressRegion: str(address.addressRegion),
              postalCode: str(address.postalCode),
              addressCountry: str(address.addressCountry),
            }
          : undefined,
        openingHoursSpecification: arr(b.openingHours).map((o: any) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: str(o?.days),
          opens: str(o?.opens),
          closes: str(o?.closes),
        })),
      }
    }
    case 'recipe':
      return {
        '@type': 'Recipe',
        name: str(b.name),
        image: imageUrl(b.image),
        description: str(b.description),
        prepTime: str(b.prepTime),
        cookTime: str(b.cookTime),
        recipeYield: str(b.recipeYield),
        recipeIngredient: arr(b.ingredients).map((i: any) => str(i?.item)),
        recipeInstructions: arr(b.instructions).map((i: any) => ({
          '@type': 'HowToStep',
          text: str(i?.text),
        })),
      }
    case 'video':
      return {
        '@type': 'VideoObject',
        name: str(b.name),
        description: str(b.description),
        thumbnailUrl: str(b.thumbnailUrl),
        uploadDate: str(b.uploadDate),
        contentUrl: str(b.contentUrl),
        embedUrl: str(b.embedUrl),
        duration: str(b.duration),
      }
    case 'custom': {
      // Escape hatch: the editor supplies raw JSON-LD. Pass it through as-is
      // (object or array of objects); strings are ignored.
      const raw = b.json
      if (raw && typeof raw === 'object') return raw as Record<string, unknown>
      return undefined
    }
    default:
      return undefined
  }
}

/**
 * Build an array of JSON-LD nodes from the stored `meta.schema` blocks. Each
 * node carries its own `@context`, so a frontend can emit them as separate
 * `<script>` tags or merge them into a single `@graph`. The `custom` block is
 * passed through verbatim (assumed to already be valid JSON-LD).
 */
export function buildJsonLd(
  blocks: SchemaBlock[] | null | undefined,
  options: BuildJsonLdOptions = {},
): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = []

  if (options.organization) {
    const org = prune(organizationNode(options.organization))
    if (org) nodes.push({ '@context': CONTEXT, ...org })
  }

  for (const block of arr(blocks) as SchemaBlock[]) {
    if (block?.blockType === 'custom') {
      const node = blockNode(block)
      // Custom JSON-LD is trusted as-is; only ensure a context is present.
      if (node) nodes.push('@context' in node ? node : { '@context': CONTEXT, ...node })
      continue
    }
    const node = prune(blockNode(block))
    if (node) nodes.push({ '@context': CONTEXT, ...node })
  }

  return nodes
}

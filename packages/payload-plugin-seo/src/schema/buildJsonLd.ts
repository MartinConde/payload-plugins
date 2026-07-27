/* Pure, Node-safe mapper: curated `meta.schema` blocks → schema.org JSON-LD
   nodes ready to emit as <script type="application/ld+json">.

   No Payload / React imports — this is shared verbatim by the optional
   `meta.jsonLdComputed` virtual field (server, afterRead) and the Astro
   frontend. Keep it dependency-free.

   Output is ONE connected graph — `{ '@context', '@graph': [...] }` — with
   stable `@id`s so Organization / WebSite / WebPage / BreadcrumbList and the
   content nodes reference each other instead of sitting as unrelated siblings.
   Consumers (and AI agents) can then walk the relationships. Only the outermost
   object carries `@context`; a nested one inside `@graph` is invalid, so every
   node's own context is stripped on the way in.

   Each stored block carries a `blockType` discriminator (the block slug) plus
   its own fields. We map only the curated types defined in
   `fields/schemaBlocks.ts`; an unknown `blockType` is skipped. Localized text
   fields are expected to arrive already resolved to a single locale (read the
   document with a `locale`); a raw `{ [locale]: value }` object falls back to
   empty. Upload fields (`image`) may be a string URL, a populated object with a
   `url`, or a bare id — only the first two yield a value (read with enough
   `depth` to populate). */

import { buildBreadcrumbList, type BreadcrumbItem } from './buildBreadcrumbList.js'

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
  /** URL of the editorial policy — a trust signal for search + AI agents. */
  publishingPrinciples?: string
  /** Year the site's content is copyrighted. */
  copyrightYear?: number | string
  /** Topical authority: subjects this organization is authoritative on. */
  knowsAbout?: Array<{ topic?: string }> | string[]
}

export type BuildJsonLdOptions = {
  /** Curated `meta.schema` blocks for this document. */
  blocks?: SchemaBlock[] | null
  /** Site-wide identity. Emitted as the `Organization` node. */
  organization?: OrganizationData
  /**
   * Absolute site origin, WITHOUT a trailing slash. Anchors the site-level
   * `@id`s. Omit it and the site-level nodes (Organization / WebSite / WebPage)
   * are all skipped — see the note on partial graphs in `buildJsonLd`.
   */
  siteUrl?: string
  /** Absolute URL of the current page. Anchors the page-level `@id`s. */
  pageUrl?: string
  /** Site name → `WebSite.name`. */
  siteName?: string
  /**
   * Site-wide description → `WebSite.description`. MUST NOT be the per-page
   * description: the WebSite `@id` is origin-keyed and therefore identical on
   * every page, so a per-page value here makes one entity whose description
   * mutates per URL — worse than omitting it. Feed this the site-wide default.
   */
  siteDescription?: string
  /** Page title → `WebPage.name`. */
  title?: string
  /** Page description → `WebPage.description`. */
  description?: string
  /** Absolute URL of the page's primary image → `WebPage.primaryImageOfPage`. */
  image?: string
  /** Locale code → `inLanguage` on `WebSite` / `WebPage`. */
  locale?: string
  /** Breadcrumb trail. Emitted only when it has at least two entries. */
  breadcrumbs?: BreadcrumbItem[] | null
}

/** A single connected JSON-LD graph, ready to `JSON.stringify` into a script tag. */
export type JsonLdGraph = {
  '@context': string
  '@graph': Record<string, unknown>[]
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

function organizationNode(org: OrganizationData, id?: string): Record<string, unknown> {
  const sameAs = arr(org.sameAs)
    .map((s) => (typeof s === 'string' ? s : str((s as { url?: unknown })?.url)))
    .filter(Boolean)
  const knowsAbout = arr(org.knowsAbout)
    .map((k) => (typeof k === 'string' ? k : str((k as { topic?: unknown })?.topic)))
    .filter(Boolean)
  return {
    '@type': 'Organization',
    '@id': id,
    name: str(org.name),
    url: str(org.url),
    logo: imageUrl(org.logo),
    sameAs: sameAs.length ? sameAs : undefined,
    publishingPrinciples: str(org.publishingPrinciples),
    copyrightYear: str(org.copyrightYear),
    knowsAbout: knowsAbout.length ? knowsAbout : undefined,
  }
}

/** A node's `@context` is only valid at the graph root — drop it on the way in. */
function stripContext(node: Record<string, unknown>): Record<string, unknown> {
  if (!('@context' in node)) return node
  const { '@context': _dropped, ...rest } = node
  return rest
}

/** `{ '@id': … }` reference, or undefined when the target isn't in the graph. */
const ref = (id: string | undefined): { '@id': string } | undefined =>
  id ? { '@id': id } : undefined

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
 * Assemble one connected JSON-LD graph for a page.
 *
 * Node layout and the references between them:
 *
 *   Organization    `${siteUrl}/#organization`
 *   WebSite         `${siteUrl}/#website`     publisher → Organization
 *   WebPage         `${pageUrl}#webpage`      isPartOf → WebSite,
 *                                             breadcrumb → BreadcrumbList,
 *                                             copyrightHolder → Organization
 *   BreadcrumbList  `${pageUrl}#breadcrumb`   (only with ≥2 crumbs)
 *   content nodes   `${pageUrl}#article` …    mainEntityOfPage → WebPage
 *
 * PARTIAL GRAPHS: the site-level nodes need absolute URLs to key their `@id`s.
 * Called without `siteUrl`/`pageUrl` — as the server-side `meta.jsonLdComputed`
 * virtual field does, since it has no request context — this returns just the
 * content-block nodes, unkeyed and unlinked. That's a valid but partial graph;
 * a frontend rendering the real `<head>` should always pass both URLs.
 */
export function buildJsonLd(options: BuildJsonLdOptions = {}): JsonLdGraph {
  const { blocks, organization, siteUrl, pageUrl, breadcrumbs } = options
  const graph: Record<string, unknown>[] = []

  // Site-level @ids are keyed off the origin so they're identical on every page
  // — that's what lets a crawler collapse the Organization into one entity
  // instead of treating each page's copy as a new one.
  const orgId = siteUrl && organization ? `${siteUrl}/#organization` : undefined
  const siteId = siteUrl ? `${siteUrl}/#website` : undefined
  const pageId = pageUrl ? `${pageUrl}#webpage` : undefined
  const crumbList = arr(breadcrumbs) as BreadcrumbItem[]
  // Google ignores single-item lists, so a lone "Home" crumb earns no node.
  const crumbId = pageUrl && crumbList.length >= 2 ? `${pageUrl}#breadcrumb` : undefined

  if (organization && orgId) {
    const node = prune(organizationNode(organization, orgId))
    if (node) graph.push(node)
  }

  if (siteId) {
    const node = prune({
      '@type': 'WebSite',
      '@id': siteId,
      url: `${siteUrl}/`,
      name: str(options.siteName),
      // Site-wide only — see the `siteDescription` doc comment.
      description: str(options.siteDescription),
      inLanguage: str(options.locale),
      publisher: ref(orgId),
    })
    if (node) graph.push(node)
  }

  if (pageId) {
    const node = prune({
      '@type': 'WebPage',
      '@id': pageId,
      url: pageUrl,
      name: str(options.title),
      description: str(options.description),
      inLanguage: str(options.locale),
      isPartOf: ref(siteId),
      breadcrumb: ref(crumbId),
      primaryImageOfPage: options.image
        ? { '@type': 'ImageObject', url: options.image }
        : undefined,
      copyrightHolder: ref(orgId),
    })
    if (node) graph.push(node)
  }

  if (crumbId) {
    graph.push({ ...stripContext(buildBreadcrumbList(crumbList)), '@id': crumbId })
  }

  // Content nodes. A page may carry two blocks of the same type, so suffix the
  // @id after the first to keep every key in the graph unique.
  const seenTypes = new Map<string, number>()
  for (const block of arr(blocks) as SchemaBlock[]) {
    const type = block?.blockType
    if (type === 'custom') {
      // Trusted verbatim — but its `@context` must go, or the graph is invalid.
      const node = blockNode(block)
      if (node) graph.push(stripContext(node))
      continue
    }
    const node = prune(blockNode(block))
    if (!node) continue
    if (pageUrl && type) {
      const n = (seenTypes.get(type) ?? 0) + 1
      seenTypes.set(type, n)
      node['@id'] = `${pageUrl}#${type}${n > 1 ? `-${n}` : ''}`
      node.mainEntityOfPage = ref(pageId)
      // Only an Article has a publisher in schema.org's sense.
      if (type === 'article') node.isPartOf = ref(pageId)
      if (type === 'article' && orgId) node.publisher = ref(orgId)
    }
    graph.push(node)
  }

  return { '@context': CONTEXT, '@graph': graph }
}

import { type BreadcrumbItem } from './buildBreadcrumbList.js';
export type SchemaBlock = {
    blockType?: string;
    [key: string]: unknown;
};
export type OrganizationData = {
    name?: string;
    url?: string;
    /** Populated logo upload (object with `url`) or a URL string. */
    logo?: unknown;
    /** `sameAs` social profiles, as stored by the settings global. */
    sameAs?: Array<{
        url?: string;
    }> | string[];
    /** URL of the editorial policy — a trust signal for search + AI agents. */
    publishingPrinciples?: string;
    /** Year the site's content is copyrighted. */
    copyrightYear?: number | string;
    /** Topical authority: subjects this organization is authoritative on. */
    knowsAbout?: Array<{
        topic?: string;
    }> | string[];
};
export type BuildJsonLdOptions = {
    /** Curated `meta.schema` blocks for this document. */
    blocks?: SchemaBlock[] | null;
    /** Site-wide identity. Emitted as the `Organization` node. */
    organization?: OrganizationData;
    /**
     * Absolute site origin, WITHOUT a trailing slash. Anchors the site-level
     * `@id`s. Omit it and the site-level nodes (Organization / WebSite / WebPage)
     * are all skipped — see the note on partial graphs in `buildJsonLd`.
     */
    siteUrl?: string;
    /** Absolute URL of the current page. Anchors the page-level `@id`s. */
    pageUrl?: string;
    /** Site name → `WebSite.name`. */
    siteName?: string;
    /**
     * Site-wide description → `WebSite.description`. MUST NOT be the per-page
     * description: the WebSite `@id` is origin-keyed and therefore identical on
     * every page, so a per-page value here makes one entity whose description
     * mutates per URL — worse than omitting it. Feed this the site-wide default.
     */
    siteDescription?: string;
    /** Page title → `WebPage.name`. */
    title?: string;
    /** Page description → `WebPage.description`. */
    description?: string;
    /** Absolute URL of the page's primary image → `WebPage.primaryImageOfPage`. */
    image?: string;
    /** Locale code → `inLanguage` on `WebSite` / `WebPage`. */
    locale?: string;
    /** Breadcrumb trail. Emitted only when it has at least two entries. */
    breadcrumbs?: BreadcrumbItem[] | null;
};
/** A single connected JSON-LD graph, ready to `JSON.stringify` into a script tag. */
export type JsonLdGraph = {
    '@context': string;
    '@graph': Record<string, unknown>[];
};
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
export declare function buildJsonLd(options?: BuildJsonLdOptions): JsonLdGraph;

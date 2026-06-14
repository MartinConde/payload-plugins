import type { GroupField } from 'payload';
export type BuildMetaFieldOptions = {
    name: string;
    uploadsCollection: string;
    localized: boolean;
    /** Group heading. Pass `false` to hide it (e.g. when the group lives in a
     *  tab that already supplies the heading). */
    label?: string | false;
    /**
     * Add a read-only `jsonLdComputed` virtual field that assembles the `schema`
     * blocks into JSON-LD on read (via `buildJsonLd`). Off by default — the
     * plugin's baseline is pure storage; the frontend can call `buildJsonLd`
     * itself. When on, consumers can read pre-assembled JSON-LD straight from the
     * API. It is never shown in the admin form (kept out of `SeoGroupInput`).
     * @default false
     */
    jsonLdVirtualField?: boolean;
};
/**
 * Builds the per-document SEO `meta` group. The group carries the
 * shadcn-admin `.input` override so the whole group renders through
 * `SeoGroupInput` (SERP/social preview + char counters) while the real
 * subfield inputs are delegated back to the host form via `renderChild` —
 * preserving localization, the OG image as a real upload relationship,
 * generated types, and queryability.
 *
 * Structure: the field tree is a FLAT list of leaves plus the two real named
 * groups (`og` / `twitter`). Sectioning (Basics → Robots & canonical → Social →
 * Advanced) is owned entirely by `SeoGroupInput`, which composes these subfields
 * by name into its own styled, Node-safe sections. The previous `collapsible` /
 * `row` wrappers were transparent containers, so dropping them does NOT move any
 * data path: `noindex`, `nofollow`, `canonicalUrl`, `jsonLd`, and the
 * `og.*` / `twitter.*` leaves all still persist at the exact same `meta.<…>`
 * paths — the data shape and generated types are unchanged.
 */
export declare const buildMetaField: ({ name, uploadsCollection, localized, label, jsonLdVirtualField, }: BuildMetaFieldOptions) => GroupField;

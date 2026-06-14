import type { CollectionConfig } from 'payload';
import type { MenuUrlResolver } from '../types.js';
export type BuildMenusCollectionOptions = {
    slug: string;
    /** Collection slugs a menu item may link to. Stashed on the tree field's
     *  `custom` so the editor's document picker knows which collections to offer. */
    linkableCollections: string[];
    localized: boolean;
    /** Max nesting levels the editor allows (1 = flat). Undefined = unlimited. */
    maxDepth?: number;
    resolveUrl?: MenuUrlResolver;
    /** Bypass access control when the afterRead hook resolves links. Default
     *  false (secure). See `MenusPluginConfig.resolveOverrideAccess`. */
    resolveOverrideAccess?: boolean;
    overrides?: Partial<CollectionConfig>;
};
/**
 * Builds the `menus` collection. Each menu is `name` + `slug` + a single
 * `tree` JSON field that stores the whole nested item tree (per locale when
 * localized). The `tree` field carries the shadcn-admin `.input` override so it
 * renders through the dnd-kit `MenuTreeEditor` instead of the raw JSON editor.
 *
 * An `afterRead` hook denormalizes `{ url, label }` per document-linked item so
 * the frontend renders without follow-up lookups.
 */
export declare const buildMenusCollection: ({ slug, linkableCollections, localized, maxDepth, resolveUrl, resolveOverrideAccess, overrides, }: BuildMenusCollectionOptions) => CollectionConfig;

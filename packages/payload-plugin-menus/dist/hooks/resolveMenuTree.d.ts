import type { CollectionAfterReadHook } from 'payload';
import type { MenuUrlResolver } from '../types.js';
type ResolveOptions = {
    linkableCollections: string[];
    resolveUrl?: MenuUrlResolver;
    /** Bypass access control when resolving linked docs. Default false (secure):
     *  docs the viewer can't read resolve to null. See `MenusPluginConfig`. */
    resolveOverrideAccess?: boolean;
};
/**
 * Factory for the menus `afterRead` hook. Walks the read tree and attaches a
 * read-only `resolved: { url, label }` to every `type: 'document'` item so the
 * frontend can render links in a single fetch. Custom-URL items get their `url`
 * mirrored into `resolved.url`. Linked docs are batch-fetched with ONE
 * `where[id][in]` query PER COLLECTION (not one per item), at the request's
 * locale; failures resolve to nulls (never throw).
 *
 * Resolution runs with `overrideAccess: false` by default, so a link to a doc
 * the current viewer can't read resolves to null (the frontend hides it) rather
 * than leaking its label/URL. Only the derived `{ url, label }` is ever
 * attached to the tree — never the linked doc itself.
 */
export declare const resolveMenuTree: ({ linkableCollections, resolveUrl, resolveOverrideAccess, }: ResolveOptions) => CollectionAfterReadHook;
export {};

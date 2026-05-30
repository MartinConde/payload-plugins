import type { CollectionConfig, PayloadRequest } from 'payload'

import type { MenuItem } from './menuTree.js'

/** Signature for a custom per-item URL resolver. Return an absolute or
 *  root-relative URL string, or null/undefined to fall back to the built-in
 *  resolution (Pages `breadcrumbs.url`, then `/{slug}`, then null). */
export type MenuUrlResolver = (args: {
  /** The linked collection slug. */
  relationTo: string
  /** The populated linked document (depth 0), or null if it couldn't be read. */
  doc: Record<string, unknown> | null
  /** The active request (carries `locale`, `payload`, `user`). */
  req: PayloadRequest
}) => string | null | undefined

export type MenusPluginConfig = {
  /**
   * Collection slugs a menu item may link to (the "document" link type). The
   * picker offers exactly these. Mirrors the SEO plugin's explicit-collections
   * style.
   * @default ['pages']
   */
  linkableCollections?: string[]
  /**
   * Slug of the generated menus collection.
   * @default 'menus'
   */
  slug?: string
  /**
   * Maximum nesting levels the editor allows (1 = flat, no submenus). Caps both
   * drag-to-nest and the indent / add-sub-item controls. Undefined = unlimited.
   */
  maxDepth?: number
  /**
   * Make the per-locale menu tree localized. Only takes effect when the Payload
   * config has `localization` configured. When on, each locale stores its own
   * tree and the editor offers a "copy structure from another locale" action.
   * @default true
   */
  localized?: boolean
  /**
   * Optional override for how a document link resolves to a URL on read. Called
   * by the `afterRead` hook for every `type: 'document'` item. Falls back to the
   * built-in strategy when it returns null/undefined.
   */
  resolveUrl?: MenuUrlResolver
  /**
   * Whether the `afterRead` hook resolves linked documents with access control
   * bypassed. Default `false` (secure): a link to a doc the current viewer
   * can't read resolves to `null` and the frontend hides it. Published, public
   * docs resolve normally. Set `true` only if navigation must surface
   * access-restricted docs (e.g. an authenticated-only menu) — note this leaks
   * the linked doc's label + URL to viewers without read access.
   * @default false
   */
  resolveOverrideAccess?: boolean
  /** Extra overrides merged onto the generated menus collection config. */
  overrides?: Partial<CollectionConfig>
  /** Disable the entire plugin (returns the config untouched). */
  disabled?: boolean
}

export type { MenuItem }

import type { Plugin } from 'payload';
import type { MenusPluginConfig } from './types.js';
/**
 * Menu builder plugin. Adds a `menus` collection whose `tree` JSON field renders
 * through shadcn-admin's `.input` override as a dnd-kit nested-tree editor.
 * Items link to a document (from `linkableCollections`) or a custom URL, with a
 * label, open-in-new-tab toggle, and CSS class. An `afterRead` hook denormalizes
 * `{ url, label }` per linked item for the frontend.
 *
 * Depends on `payload-plugin-shadcn-admin` for the doc-form override surface and
 * UI. Register this BEFORE `shadcnAdminPlugin` so the collection exists when the
 * admin plugin installs its auto list/doc views over it (consumer-wins: skips if
 * the slug already exists).
 */
export declare const menusPlugin: (options?: MenusPluginConfig) => Plugin;

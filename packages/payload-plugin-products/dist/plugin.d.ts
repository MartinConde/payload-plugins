import type { Plugin } from 'payload';
import type { ProductsPluginConfig } from './types.js';
/**
 * Products plugin. Adds a `products` collection whose `printAreas` JSON field
 * renders through shadcn-admin's `.input` override as a Fabric.js canvas editor:
 * upload a mockup image (a sibling `upload` field) and lay out one or more
 * physically-sized, aspect-locked print areas on top of it (move / resize /
 * align).
 *
 * Depends on `payload-plugin-shadcn-admin` for the doc-form override surface and
 * UI. Register this BEFORE `shadcnAdminPlugin` so the collection exists when the
 * admin plugin installs its auto list/doc views over it (consumer-wins: skips if
 * the slug already exists).
 */
export declare const productsPlugin: (options?: ProductsPluginConfig) => Plugin;

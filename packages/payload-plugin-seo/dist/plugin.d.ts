import type { Plugin } from 'payload';
import type { SeoPluginConfig } from './types.js';
/**
 * SEO plugin. Adds a per-document `meta` group (rendered by shadcn-admin's
 * group-level `.input` override → `SeoGroupInput`), a site-wide SEO defaults
 * global, and a redirects collection.
 *
 * Register this BEFORE `shadcnAdminPlugin` so the group/global/collection it
 * adds exist when the admin plugin installs its auto views over them.
 *
 * INTENTIONALLY CUSTOM — this is a deliberate in-house replacement for the
 * official `@payloadcms/plugin-seo` + `@payloadcms/plugin-redirects`, chosen
 * for the curated JSON-LD schema blocks and the shadcn-admin UI integration
 * (the `.input` overrides + wizard view). Do NOT co-register the official
 * plugins: this plugin's `meta` group and `redirects` collection would collide
 * with theirs (duplicate fields / slugs). Consumer-wins guards skip re-adding
 * an already-present slug/field, but they won't reconcile two competing shapes.
 */
export declare const seoPlugin: (options?: SeoPluginConfig) => Plugin;

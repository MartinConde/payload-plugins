import { MenuTreeInput } from '../ui/MenuTreeInput.js';
import { menusT } from '../translations.js';
import { resolveMenuTree } from '../hooks/resolveMenuTree.js';
import { normalizeMenuTree, stripResolved } from '../menuTree.js';
const slugify = (value)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// Fill `slug` from `name` when empty, then slugify — so editors don't hand-type
// a slug and the persisted value is always clean. Mirrors the Pages collection.
const formatSlug = ({ value, data, originalDoc })=>{
    if (typeof value === 'string' && value.length > 0) return slugify(value);
    const fallback = data?.name ?? originalDoc?.name;
    return typeof fallback === 'string' ? slugify(fallback) : value;
};
// Guarantee a clean stored tree no matter who writes it (the editor already
// strips, but a direct REST/API write could carry malformed items or the
// derived `resolved` field). Leave `undefined` untouched so a write that omits
// the field — or omits this locale — never force-clears it.
const sanitizeTree = ({ value })=>value === undefined ? undefined : stripResolved(normalizeMenuTree(value));
/**
 * Builds the `menus` collection. Each menu is `name` + `slug` + a single
 * `tree` JSON field that stores the whole nested item tree (per locale when
 * localized). The `tree` field carries the shadcn-admin `.input` override so it
 * renders through the dnd-kit `MenuTreeEditor` instead of the raw JSON editor.
 *
 * An `afterRead` hook denormalizes `{ url, label }` per document-linked item so
 * the frontend renders without follow-up lookups.
 */ export const buildMenusCollection = ({ slug, linkableCollections, localized, maxDepth, resolveUrl, resolveOverrideAccess, overrides })=>({
        slug,
        labels: {
            singular: menusT('pluginMenus:menuSingular'),
            plural: menusT('pluginMenus:menuPlural')
        },
        admin: {
            useAsTitle: 'name',
            defaultColumns: [
                'name',
                'slug',
                'updatedAt'
            ],
            description: menusT('pluginMenus:menusDesc'),
            ...overrides?.admin
        },
        hooks: {
            ...overrides?.hooks,
            afterRead: [
                resolveMenuTree({
                    linkableCollections,
                    resolveUrl,
                    resolveOverrideAccess
                }),
                ...overrides?.hooks?.afterRead ?? []
            ]
        },
        fields: [
            {
                name: 'name',
                type: 'text',
                required: true,
                label: menusT('pluginMenus:nameLabel'),
                admin: {
                    description: menusT('pluginMenus:nameDesc')
                }
            },
            {
                name: 'slug',
                type: 'text',
                required: true,
                unique: true,
                index: true,
                label: menusT('pluginMenus:slugLabel'),
                admin: {
                    description: menusT('pluginMenus:slugDesc')
                },
                hooks: {
                    beforeValidate: [
                        formatSlug
                    ]
                }
            },
            {
                name: 'tree',
                type: 'json',
                localized,
                hooks: {
                    beforeChange: [
                        sanitizeTree
                    ]
                },
                // No defaultValue: on a localized json field Payload's per-locale vs.
                // wholesale default is ambiguous, and the editor renders fine on
                // `undefined` (normalizeMenuTree → []).
                label: menusT('pluginMenus:treeLabel'),
                admin: {
                    description: menusT('pluginMenus:treeDesc')
                },
                custom: {
                    // Direct client-component reference (NOT a string path) — mirrors the
                    // verified `.input` override pattern (see payload-plugin-seo's
                    // metaField). shadcn-admin's FieldInput renders this as
                    // `<Override {...props} />` BEFORE its built-in type switch, so it
                    // pre-empts the raw JSON editor. `MenuTreeInput` is Node-safe (it lazy-
                    // loads the heavy editor), so pulling it into the config graph here
                    // doesn't crash the Payload CLI.
                    //
                    // `linkableCollections` rides INSIDE this namespace (not a sibling
                    // `plugin-menus` key) on purpose: shadcn-admin's extractCollection only
                    // carries `custom['plugin-shadcn-admin']` across the RSC→client
                    // boundary, so a foreign namespace would be dropped before the editor
                    // sees it. A plain string[] is serializable, so it survives here and the
                    // editor reads it off `field.custom['plugin-shadcn-admin']`.
                    'plugin-shadcn-admin': {
                        input: MenuTreeInput,
                        linkableCollections,
                        maxDepth
                    }
                }
            },
            ...overrides?.fields ?? []
        ],
        ...overrides ? Object.fromEntries(Object.entries(overrides).filter(([k])=>![
                'admin',
                'hooks',
                'fields'
            ].includes(k))) : {}
    });

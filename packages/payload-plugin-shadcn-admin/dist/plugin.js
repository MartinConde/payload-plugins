import { deepMergeSimple } from './internal/payloadAdapter.js';
import { findBlockingRequiredFields } from './features/doc-form/eligibility/isSupportedForDocForm.js';
import { shadcnAdminTranslations } from './translations.js';
const AUTO_VIEW_PATH = 'payload-plugin-shadcn-admin/rsc#AutoCollectionListView';
const AUTO_DOC_VIEW_PATH = 'payload-plugin-shadcn-admin/rsc#AutoCollectionDocView';
const AUTO_VERSIONS_VIEW_PATH = 'payload-plugin-shadcn-admin/rsc#AutoVersionsView';
const AUTO_VERSION_VIEW_PATH = 'payload-plugin-shadcn-admin/rsc#AutoVersionView';
const AUTO_API_VIEW_PATH = 'payload-plugin-shadcn-admin/rsc#AutoApiView';
const DEFAULT_NAV_PATH = 'payload-plugin-shadcn-admin/rsc#DefaultNav';
const BROWSE_BY_FOLDER_VIEW_PATH = 'payload-plugin-shadcn-admin/rsc#AutoBrowseByFolderView';
const DASHBOARD_VIEW_PATH = 'payload-plugin-shadcn-admin/rsc#AutoDashboardView';
const PLUGIN_NAMESPACE = 'plugin-shadcn-admin';
const REBUILD_FRONTEND_DEFAULT_PATH = '/rebuild-frontend';
const REBUILD_FRONTEND_DEFAULT_ENV = 'FRONTEND_DEPLOY_HOOK_URL';
const REBUILD_FRONTEND_DEFAULT_LABEL = 'Rebuild Frontend';
/* Root-level Account + auth view overrides, keyed by the `admin.routes` key
   `getRouteData` resolves the current path to. `getCustomViewByKey` reads
   `config.admin.components.views[key].Component`, so these keys must match
   Payload's route keys exactly. `inactivity` maps to `/logout-inactivity`.
   `reset` and `verify` are intentionally absent — Payload hardcodes
   `ResetPassword` and `Verify` directly inside `getRouteData` BEFORE any
   `getCustomViewByKey` lookup, so `admin.components.views.{reset,verify}`
   is silently ignored. Re-verified against payload@3.84.1 on 2026-05-28
   (see @payloadcms/next/dist/views/Root/getRouteData.js:157-164, 212-221).
   Re-check on each Payload minor bump — if upstream moves these through
   `getCustomViewByKey`, add the keys here. */ const AUTH_VIEW_PATHS = {
    account: 'payload-plugin-shadcn-admin/rsc#AutoAccountView',
    login: 'payload-plugin-shadcn-admin/rsc#AutoLoginView',
    createFirstUser: 'payload-plugin-shadcn-admin/rsc#AutoCreateFirstUserView',
    forgot: 'payload-plugin-shadcn-admin/rsc#AutoForgotPasswordView',
    logout: 'payload-plugin-shadcn-admin/rsc#AutoLogoutView',
    inactivity: 'payload-plugin-shadcn-admin/rsc#AutoLogoutInactivityView',
    unauthorized: 'payload-plugin-shadcn-admin/rsc#AutoUnauthorizedView'
};
const warnedSkips = new Set();
const buildSelector = (target)=>{
    if (target === 'all') return ()=>true;
    const set = new Set(target);
    return (slug)=>set.has(slug);
};
const installAutoListView = (collection)=>{
    // Consumer-defined list view wins.
    if (collection.admin?.components?.views?.list) return collection;
    return {
        ...collection,
        admin: {
            ...collection.admin,
            components: {
                ...collection.admin?.components,
                views: {
                    ...collection.admin?.components?.views,
                    list: {
                        Component: AUTO_VIEW_PATH
                    }
                }
            }
        }
    };
};
const installAutoDocView = (collection, skipped)=>{
    // Consumer-defined edit view (any non-empty value) wins.
    if (collection.admin?.components?.views?.edit) return collection;
    // Pre-flight: skip if any required field is outside the v1 doc-form matrix
    // (or the collection is an upload collection). Warn once per slug and
    // push onto the shared skip accumulator so the AdminProviders banner can
    // tell admins which collections fell back to Payload's default edit view.
    const blockers = findBlockingRequiredFields(collection);
    if (blockers.length > 0) {
        const types = Array.from(new Set(blockers.map((b)=>b.type)));
        skipped.push({
            kind: 'collection',
            slug: collection.slug,
            types
        });
        if (!warnedSkips.has(collection.slug)) {
            warnedSkips.add(collection.slug);
            // eslint-disable-next-line no-console
            console.warn(`[plugin-shadcn-admin] Skipping defaultDocView for "${collection.slug}": ` + `required fields of unsupported types: ${types.join(', ')}. ` + `Falling back to Payload's default edit view.`);
        }
        return collection;
    }
    // When the collection has versions enabled, also take over the `versions`
    // (list) and `version` (single diff) edit-view slots so the header's
    // "Versions" tab lands on the plugin's own shadcn views instead of
    // Payload's default chrome. The `edit` guard above already enforces
    // consumer-wins, so no extra check is needed here.
    const versionSlots = collection.versions ? {
        versions: {
            Component: AUTO_VERSIONS_VIEW_PATH
        },
        version: {
            Component: AUTO_VERSION_VIEW_PATH
        }
    } : {};
    return {
        ...collection,
        admin: {
            ...collection.admin,
            components: {
                ...collection.admin?.components,
                views: {
                    ...collection.admin?.components?.views,
                    edit: {
                        default: {
                            Component: AUTO_DOC_VIEW_PATH
                        },
                        // API view is universal (not gated by `versions`), but only
                        // installed here — after the eligibility early-return above — so a
                        // collection that falls back to Payload's default edit view keeps
                        // Payload's default API view too (no mixed chrome).
                        api: {
                            Component: AUTO_API_VIEW_PATH
                        },
                        ...versionSlots
                    }
                }
            }
        }
    };
};
/* Global twin of installAutoDocView. Globals register custom edit views at the
   SAME `admin.components.views.edit.{default,api,versions,version}` keys as
   collections (verified against Payload's GlobalAdminOptions / EditConfig), and
   the RSC components branch on `initPageResult.globalConfig` at render time —
   so we reuse the exact same component paths. Singletons have no list view and
   no create mode; the differences (upsert wire, no doc ID) live in the
   components, not the registration. */ const installAutoGlobalDocView = (global, skipped)=>{
    // Consumer-defined edit view (any non-empty value) wins.
    if (global.admin?.components?.views?.edit) return global;
    // Same eligibility skip as collections. `findBlockingRequiredFields` reads
    // `{ fields?, upload? }`; globals have no `upload`, so the upload branch is a
    // no-op. Warn once per slug (shares the collection warn set — slugs are
    // distinct across entities in practice and the message names the entity).
    const blockers = findBlockingRequiredFields(global);
    if (blockers.length > 0) {
        const types = Array.from(new Set(blockers.map((b)=>b.type)));
        skipped.push({
            kind: 'global',
            slug: global.slug,
            types
        });
        if (!warnedSkips.has(global.slug)) {
            warnedSkips.add(global.slug);
            // eslint-disable-next-line no-console
            console.warn(`[plugin-shadcn-admin] Skipping defaultGlobalView for "${global.slug}": ` + `required fields of unsupported types: ${types.join(', ')}. ` + `Falling back to Payload's default edit view.`);
        }
        return global;
    }
    const versionSlots = global.versions ? {
        versions: {
            Component: AUTO_VERSIONS_VIEW_PATH
        },
        version: {
            Component: AUTO_VERSION_VIEW_PATH
        }
    } : {};
    return {
        ...global,
        admin: {
            ...global.admin,
            components: {
                ...global.admin?.components,
                views: {
                    ...global.admin?.components?.views,
                    edit: {
                        default: {
                            Component: AUTO_DOC_VIEW_PATH
                        },
                        api: {
                            Component: AUTO_API_VIEW_PATH
                        },
                        ...versionSlots
                    }
                }
            }
        }
    };
};
/* Registers AdminProviders so SidebarProvider sits above the entire admin.

   Optional opt-ins:
   - `defaultListView`: walks `config.collections` and installs a shadcn auto
     list view on matching collections that don't already define one.
   - `defaultNav`: installs a default shadcn Nav at `admin.components.Nav` and
     stashes branding on `config.custom['plugin-shadcn-admin']` for the Nav RSC
     to read at render time.

   Consumer-defined slots always win — the plugin only fills empty ones. */ export const shadcnAdminPlugin = (options = {})=>(config)=>{
        if (options.disabled) return config;
        const existingProviders = config.admin?.components?.providers ?? [];
        const existingComponents = config.admin?.components ?? {};
        const next = {
            ...config,
            admin: {
                ...config.admin,
                components: {
                    ...existingComponents,
                    providers: [
                        ...existingProviders,
                        'payload-plugin-shadcn-admin/client#AdminProviders'
                    ]
                }
            },
            // Merge our admin-UI translations into the app's. deepMergeSimple is
            // additive and consumer-wins-friendly (we merge our keys ON TOP of any
            // existing translations, but only under our own `shadcnAdmin` namespace,
            // so nothing the app or another plugin defined is clobbered).
            i18n: {
                ...config.i18n,
                translations: deepMergeSimple(config.i18n?.translations ?? {}, shadcnAdminTranslations)
            }
        };
        // defaultListView: install AutoCollectionListView on matching collections.
        const listTarget = options.defaultListView ?? false;
        if (listTarget !== false) {
            const selector = buildSelector(listTarget);
            next.collections = (config.collections ?? []).map((collection)=>selector(collection.slug) ? installAutoListView(collection) : collection);
        }
        // Shared accumulator for collections/globals the auto doc view declined
        // to wrap. Surfaced on `config.custom['plugin-shadcn-admin'].skippedDocViews`
        // below so the client banner can list them.
        const skippedDocViews = [];
        // defaultDocView: install AutoCollectionDocView on matching collections.
        // Runs over the (possibly already list-view-wrapped) collections from the
        // previous pass so consumer-wins guards still apply.
        const docTarget = options.defaultDocView ?? false;
        if (docTarget !== false) {
            const selector = buildSelector(docTarget);
            next.collections = (next.collections ?? config.collections ?? []).map((collection)=>selector(collection.slug) ? installAutoDocView(collection, skippedDocViews) : collection);
        }
        // defaultGlobalView: install AutoCollectionDocView (global branch) on
        // matching globals. Mirrors the defaultDocView pass but walks
        // `config.globals`.
        const globalTarget = options.defaultGlobalView ?? false;
        if (globalTarget !== false) {
            const selector = buildSelector(globalTarget);
            next.globals = (config.globals ?? []).map((global)=>selector(global.slug) ? installAutoGlobalDocView(global, skippedDocViews) : global);
        }
        // Build the plugin's config.custom stash incrementally so that all keys
        // (`skippedDocViews`, `nav`, `rebuildFrontend`) coexist regardless of
        // which options are enabled. We accumulate into `pluginCustom` and write
        // once at the end of the factory. Always spread from `next.custom` (not
        // `config.custom`) so earlier plugin passes are preserved.
        const pluginCustom = {
            ...next.custom?.[PLUGIN_NAMESPACE],
            // Always stash the skip list (empty array when none) so the client
            // AdminProviders banner can rely on a stable shape.
            skippedDocViews
        };
        // defaultNav: install DefaultNav at admin.components.Nav, stash branding
        // and (optional) explicit sidebar tree on config.custom so the RSC can
        // read it at render time.
        if (options.defaultNav) {
            if (!existingComponents.Nav) {
                next.admin.components.Nav = DEFAULT_NAV_PATH;
            }
            pluginCustom.nav = {
                branding: options.defaultNav.branding,
                sidebar: options.defaultNav.sidebar
            };
        }
        // defaultAuthViews: install shadcn Account + auth views at
        // config.admin.components.views.<key>. Consumer-defined keys win — we only
        // fill the ones they haven't set.
        if (options.defaultAuthViews) {
            const existingViews = next.admin?.components?.views ?? {};
            const views = {
                ...existingViews
            };
            for (const [key, componentPath] of Object.entries(AUTH_VIEW_PATHS)){
                if (views[key]) continue; // consumer wins
                views[key] = {
                    Component: componentPath
                };
            }
            next.admin.components.views = views;
        }
        // defaultFolderView: install the shadcn Browse-by-Folder view at
        // config.admin.components.views.browseByFolder. The router's case-1
        // custom-view lookup (getCustomViewByKey) resolves this before Payload's
        // default folder builder runs — same mechanism as the `account` override.
        if (options.defaultFolderView) {
            const existingViews = next.admin?.components?.views ?? {};
            if (!existingViews.browseByFolder) {
                next.admin.components.views = {
                    ...existingViews,
                    browseByFolder: {
                        Component: BROWSE_BY_FOLDER_VIEW_PATH
                    }
                };
            }
        }
        // defaultDashboard: install the shadcn dashboard at
        // config.admin.components.views.dashboard. The root `/admin` route is
        // hardcoded to Payload's DashboardView, but that view renders
        // `views.dashboard.Component` with its own DefaultDashboard as fallback —
        // so this slot replaces the landing page. Consumer-defined dashboard wins.
        if (options.defaultDashboard) {
            const existingViews = next.admin?.components?.views ?? {};
            if (!existingViews.dashboard) {
                next.admin.components.views = {
                    ...existingViews,
                    dashboard: {
                        Component: DASHBOARD_VIEW_PATH
                    }
                };
            }
        }
        // rebuildFrontend: register a POST endpoint that triggers a frontend
        // rebuild by POSTing to a deploy-hook URL read from a server-side env var.
        // The URL is never exposed to the client. We also stash the (non-secret)
        // label and endpointPath so the sidebar button component can read them via
        // config.custom.
        if (options.rebuildFrontend) {
            const deployHookEnv = options.rebuildFrontend.deployHookEnv ?? REBUILD_FRONTEND_DEFAULT_ENV;
            const endpointPath = options.rebuildFrontend.endpointPath ?? REBUILD_FRONTEND_DEFAULT_PATH;
            // label is optional in the stash — when absent the component falls back
            // to the shadcnAdmin:rebuildFrontend translation key.
            const label = options.rebuildFrontend.label;
            next.endpoints = [
                ...config.endpoints ?? [],
                {
                    path: endpointPath,
                    method: 'post',
                    handler: async (req)=>{
                        if (!req.user) {
                            return Response.json({
                                error: 'Unauthorized'
                            }, {
                                status: 401
                            });
                        }
                        const url = process.env[deployHookEnv];
                        if (!url) {
                            req.payload.logger.error(`[plugin-shadcn-admin] rebuildFrontend: env var "${deployHookEnv}" is not set`);
                            return Response.json({
                                error: 'Deploy hook not configured'
                            }, {
                                status: 500
                            });
                        }
                        try {
                            const hookRes = await fetch(url, {
                                method: 'POST'
                            });
                            if (!hookRes.ok) {
                                req.payload.logger.error(`[plugin-shadcn-admin] rebuildFrontend: deploy hook returned ${hookRes.status}`);
                                return Response.json({
                                    error: `Deploy hook failed (${hookRes.status})`
                                }, {
                                    status: 502
                                });
                            }
                            return Response.json({
                                ok: true
                            });
                        } catch (err) {
                            req.payload.logger.error(`[plugin-shadcn-admin] rebuildFrontend: request failed — ${err instanceof Error ? err.message : String(err)}`);
                            return Response.json({
                                error: 'Deploy hook request failed'
                            }, {
                                status: 502
                            });
                        }
                    }
                }
            ];
            // Stash only the non-secret, serializable values for the client button.
            // label is omitted when the consumer didn't set it — the component
            // falls back to the shadcnAdmin:rebuildFrontend translation key.
            pluginCustom.rebuildFrontend = label !== undefined ? {
                label,
                endpointPath
            } : {
                endpointPath
            };
        }
        // Single consolidated write to next.custom so that skippedDocViews, nav,
        // and rebuildFrontend all coexist regardless of which options are active.
        next.custom = {
            ...next.custom,
            [PLUGIN_NAMESPACE]: pluginCustom
        };
        return next;
    };

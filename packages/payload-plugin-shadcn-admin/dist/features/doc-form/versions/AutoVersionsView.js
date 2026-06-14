import { jsx as _jsx } from "react/jsx-runtime";
import { ViewShell } from 'payload-plugin-shadcn-ui';
import { extractCollection, stringifyLabel } from 'payload-plugin-shadcn-ui';
import { extractGlobal } from 'payload-plugin-shadcn-ui';
import { DocViewTabs } from '../DocViewTabs.js';
import { hasDraftsEnabled } from '../drafts/draftsConfig.js';
import { VersionsList } from './VersionsList.js';
const PAGE_SIZE = 20;
const titleCase = (slug)=>slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
/* Versions LIST view, installed at `admin.components.views.edit.versions` by
   the plugin for any versioned collection OR global it owns. Renders inside the
   plugin's shadcn chrome (ViewShell + DocViewTabs) instead of Payload's
   default. Globals branch off `globalConfig` (no docID; `findGlobalVersions`
   keyed on the parent global rather than a per-doc `parent` filter).
   Mounted as `payload-plugin-shadcn-admin/rsc#AutoVersionsView`. v3.9. */ export async function AutoVersionsView(serverProps) {
    const { initPageResult, searchParams, payload } = serverProps;
    const t = serverProps.i18n.t;
    const collection = initPageResult?.collectionConfig;
    const global = initPageResult?.globalConfig;
    const isGlobal = Boolean(global) && !collection;
    const entity = isGlobal ? global : collection;
    const entitySlug = entity?.slug;
    const docID = initPageResult?.docID;
    // Collections need a docID; globals are singletons (no docID).
    if (!entity || !entitySlug || !isGlobal && docID === undefined) {
        return /*#__PURE__*/ _jsx(ViewShell, {
            breadcrumbs: [
                {
                    label: t('version:versions')
                }
            ],
            children: /*#__PURE__*/ _jsx("p", {
                className: "text-muted-foreground",
                children: t('shadcnAdmin:couldNotResolveDocument')
            })
        });
    }
    const page = Math.max(1, Number(searchParams?.page) || 1);
    // Match Payload's native versions list: when localization + drafts are both
    // on, exclude per-locale publish "snapshot" rows (otherwise each per-locale
    // publish shows as a duplicate). The list shows all real versions across
    // locales — Payload does not filter the list by locale.
    const hasLocalization = Boolean(payload?.config?.localization);
    const extracted = isGlobal ? extractGlobal(global, serverProps.i18n) : extractCollection(collection, serverProps.i18n);
    const draftsEnabled = hasDraftsEnabled(extracted);
    // Globals' findGlobalVersions scopes to the parent global by slug — no
    // per-doc `parent` filter. Collections filter on `parent === docID`.
    const and = isGlobal ? [] : [
        {
            parent: {
                equals: docID
            }
        }
    ];
    if (hasLocalization && draftsEnabled) {
        and.push({
            snapshot: {
                not_equals: true
            }
        });
    }
    const where = and.length > 0 ? {
        and
    } : undefined;
    let rows = [];
    let totalPages = 1;
    try {
        const result = isGlobal ? await payload.findGlobalVersions({
            slug: entitySlug,
            where: where,
            limit: PAGE_SIZE,
            page,
            sort: '-updatedAt',
            depth: 0,
            req: initPageResult?.req,
            overrideAccess: false
        }) : await payload.findVersions({
            collection: entitySlug,
            where: where,
            limit: PAGE_SIZE,
            page,
            sort: '-updatedAt',
            depth: 0,
            req: initPageResult?.req,
            overrideAccess: false
        });
        totalPages = result.totalPages ?? 1;
        rows = (result.docs ?? []).map((v)=>({
                id: String(v.id),
                updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : '',
                status: v.version?._status ?? null,
                autosave: Boolean(v.autosave),
                publishedLocale: typeof v.publishedLocale === 'string' ? v.publishedLocale : null
            }));
    } catch  {
    // Leave rows empty; the table renders its empty state.
    }
    let editTitle;
    let pluralLabel;
    let basePath;
    const baseCrumbs = [];
    if (isGlobal) {
        editTitle = stringifyLabel(global.label, serverProps.i18n) ?? titleCase(entitySlug);
        pluralLabel = editTitle;
        basePath = `/admin/globals/${entitySlug}`;
        baseCrumbs.push({
            label: t('general:globals')
        }, {
            label: editTitle,
            href: basePath
        });
    } else {
        const useAsTitle = collection.admin?.useAsTitle;
        const doc = serverProps.doc;
        editTitle = useAsTitle && doc && typeof doc[useAsTitle] === 'string' ? String(doc[useAsTitle]) : String(docID);
        pluralLabel = stringifyLabel(collection.labels?.plural, serverProps.i18n) ?? titleCase(entitySlug);
        basePath = `/admin/collections/${entitySlug}/${docID}`;
        baseCrumbs.push({
            label: t('general:collections')
        }, {
            label: pluralLabel,
            href: `/admin/collections/${entitySlug}`
        }, {
            label: editTitle,
            href: basePath
        });
    }
    return /*#__PURE__*/ _jsx(ViewShell, {
        className: "shadcn-auto-doc-view",
        headerActions: /*#__PURE__*/ _jsx(DocViewTabs, {
            active: "versions",
            hasVersions: true
        }),
        breadcrumbs: [
            ...baseCrumbs,
            {
                label: t('version:versions')
            }
        ],
        children: /*#__PURE__*/ _jsx(VersionsList, {
            rows: rows,
            basePath: basePath,
            page: page,
            totalPages: totalPages
        })
    });
}

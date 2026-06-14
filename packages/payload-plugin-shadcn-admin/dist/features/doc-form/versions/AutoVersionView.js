import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRightIcon } from 'lucide-react';
import { ViewShell } from 'payload-plugin-shadcn-ui';
import { Badge } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { extractCollection, stringifyLabel } from 'payload-plugin-shadcn-ui';
import { extractGlobal } from 'payload-plugin-shadcn-ui';
import { DocViewTabs } from '../DocViewTabs.js';
import { hasDraftsEnabled } from '../drafts/draftsConfig.js';
import { persistedStatusPill, toneClassName } from '../drafts/statusPill.js';
import { buildDiffFields } from './buildDiffFields.js';
import { extractLocales } from './serverHelpers.js';
import { SelectComparison } from './SelectComparison.js';
import { SelectLocales } from './SelectLocales.js';
import { RestoreVersion } from './RestoreVersion.js';
const titleCase = (slug)=>slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
const fmt = (iso)=>{
    if (typeof iso !== 'string') return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};
function StatusPill({ status, t }) {
    if (!status) return null;
    const pill = persistedStatusPill(status, t);
    return /*#__PURE__*/ _jsx(Badge, {
        variant: "outline",
        className: cn('font-medium', toneClassName(pill.tone)),
        children: pill.label
    });
}
/* Single version DIFF view, installed at `admin.components.views.edit.version`.
   Mirrors Payload's data-flow (fetch versionTo / versionFrom / comparison
   options + selected locales from URL params) but renders the field diff with
   the plugin's own walk (buildDiffFields) on `@payloadcms/ui` primitives.
   Mounted as `payload-plugin-shadcn-admin/rsc#AutoVersionView`. v3.9. */ export async function AutoVersionView(serverProps) {
    const { initPageResult, searchParams, payload, routeSegments, i18n } = serverProps;
    const t = i18n.t;
    const collection = initPageResult?.collectionConfig;
    const global = initPageResult?.globalConfig;
    const isGlobal = Boolean(global) && !collection;
    const entity = isGlobal ? global : collection;
    const entitySlug = entity?.slug;
    const docID = initPageResult?.docID;
    if (!entity || !entitySlug || !isGlobal && docID === undefined) {
        return /*#__PURE__*/ _jsx(ViewShell, {
            breadcrumbs: [
                {
                    label: t('version:version')
                }
            ],
            children: /*#__PURE__*/ _jsx("p", {
                className: "text-muted-foreground",
                children: t('shadcnAdmin:couldNotResolveDocument')
            })
        });
    }
    const versionToID = routeSegments?.[routeSegments.length - 1];
    const basePath = isGlobal ? `/admin/globals/${entitySlug}` : `/admin/collections/${entitySlug}/${docID}`;
    const versionTo = await (isGlobal ? payload.findGlobalVersionByID({
        slug: entitySlug,
        id: String(versionToID),
        locale: 'all',
        depth: 1,
        req: initPageResult?.req,
        overrideAccess: false,
        disableErrors: true
    }) : payload.findVersionByID({
        collection: entitySlug,
        id: String(versionToID),
        locale: 'all',
        depth: 1,
        req: initPageResult?.req,
        overrideAccess: false,
        disableErrors: true
    })).catch(()=>null);
    const entityLabel = isGlobal ? stringifyLabel(global.label, i18n) ?? titleCase(entitySlug) : stringifyLabel(collection.labels?.plural, i18n) ?? titleCase(entitySlug);
    const baseCrumbs = isGlobal ? [
        {
            label: t('general:globals')
        },
        {
            label: entityLabel,
            href: basePath
        },
        {
            label: t('version:versions'),
            href: `${basePath}/versions`
        }
    ] : [
        {
            label: t('general:collections')
        },
        {
            label: entityLabel,
            href: `/admin/collections/${entitySlug}`
        },
        {
            label: String(docID),
            href: basePath
        },
        {
            label: t('version:versions'),
            href: `${basePath}/versions`
        }
    ];
    if (!versionTo) {
        return /*#__PURE__*/ _jsx(ViewShell, {
            className: "shadcn-auto-doc-view",
            headerActions: /*#__PURE__*/ _jsx(DocViewTabs, {
                active: "versions"
            }),
            breadcrumbs: [
                ...baseCrumbs,
                {
                    label: t('version:version')
                }
            ],
            children: /*#__PURE__*/ _jsx("p", {
                className: "text-muted-foreground",
                children: t('shadcnAdmin:versionNotFound')
            })
        });
    }
    // Locale selection from `?localeCodes` (JSON array) else all configured.
    const localeInfo = extractLocales(payload?.config?.localization);
    const allLocaleCodes = (localeInfo?.locales ?? []).map((l)=>l.code);
    let selectedLocales = allLocaleCodes;
    if (typeof searchParams?.localeCodes === 'string') {
        try {
            const parsed = JSON.parse(searchParams.localeCodes);
            if (Array.isArray(parsed) && parsed.length > 0) {
                selectedLocales = parsed.filter((c)=>allLocaleCodes.includes(c));
            }
        } catch  {
        // ignore malformed param; fall back to all locales
        }
    }
    // versionFrom: explicit `?versionFrom` else the version immediately prior.
    const versionFromIDParam = typeof searchParams?.versionFrom === 'string' ? searchParams.versionFrom : null;
    // Per-doc `parent` filter only applies to collections; globals' version
    // queries scope to the parent global by slug.
    const parentFilter = isGlobal ? [] : [
        {
            parent: {
                equals: docID
            }
        }
    ];
    const findVersionByIDFor = (id)=>isGlobal ? payload.findGlobalVersionByID({
            slug: entitySlug,
            id,
            locale: 'all',
            depth: 1,
            req: initPageResult?.req,
            overrideAccess: false,
            disableErrors: true
        }) : payload.findVersionByID({
            collection: entitySlug,
            id,
            locale: 'all',
            depth: 1,
            req: initPageResult?.req,
            overrideAccess: false,
            disableErrors: true
        });
    const findVersionsFor = (where, limit)=>isGlobal ? payload.findGlobalVersions({
            slug: entitySlug,
            where: where,
            sort: '-updatedAt',
            limit,
            depth: limit === 1 ? 1 : 0,
            locale: 'all',
            req: initPageResult?.req,
            overrideAccess: false
        }) : payload.findVersions({
            collection: entitySlug,
            where: where,
            sort: '-updatedAt',
            limit,
            depth: limit === 1 ? 1 : 0,
            locale: 'all',
            req: initPageResult?.req,
            overrideAccess: false
        });
    let versionFrom = null;
    if (versionFromIDParam) {
        versionFrom = await findVersionByIDFor(versionFromIDParam).catch(()=>null);
    }
    if (!versionFrom) {
        const prev = await findVersionsFor({
            and: [
                ...parentFilter,
                {
                    updatedAt: {
                        less_than: versionTo.updatedAt
                    }
                }
            ]
        }, 1).catch(()=>null);
        versionFrom = prev?.docs?.[0] ?? null;
    }
    // Comparison dropdown options: recent versions of this doc (excluding the
    // target), labelled by timestamp + status.
    const optionsResult = await findVersionsFor(parentFilter.length > 0 ? {
        and: parentFilter
    } : {}, 50).catch(()=>null);
    const comparisonOptions = (optionsResult?.docs ?? []).filter((v)=>String(v.id) !== String(versionTo.id)).map((v)=>{
        const status = v.version?._status === 'published' ? t('version:published') : t('version:draft');
        return {
            value: String(v.id),
            label: `${fmt(v.updatedAt)} · ${status}`
        };
    });
    const extracted = isGlobal ? extractGlobal(global, i18n) : extractCollection(collection, i18n);
    const fields = extracted.fields;
    const draftsEnabled = hasDraftsEnabled(extracted);
    const diffRows = buildDiffFields({
        fields,
        valuesFrom: versionFrom?.version,
        valuesTo: versionTo.version,
        selectedLocales,
        locales: localeInfo?.locales ?? [],
        i18n
    });
    // `_status` is a plain string normally, but a locale-keyed object when
    // `localizeStatus` is on — in which case a single header pill is ambiguous,
    // so we suppress it (the per-locale status changes show in the diff rows).
    const statusOf = (v)=>typeof v?.version?._status === 'string' ? v.version._status : null;
    const toStatus = statusOf(versionTo);
    const fromStatus = statusOf(versionFrom);
    return /*#__PURE__*/ _jsxs(ViewShell, {
        className: "shadcn-auto-doc-view",
        headerActions: /*#__PURE__*/ _jsx(DocViewTabs, {
            active: "versions",
            hasVersions: true
        }),
        breadcrumbs: [
            ...baseCrumbs,
            {
                label: fmt(versionTo.updatedAt) || t('version:version')
            }
        ],
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-wrap items-center justify-between gap-3",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex flex-wrap items-center gap-3",
                        children: [
                            /*#__PURE__*/ _jsx(SelectComparison, {
                                options: comparisonOptions,
                                selected: versionFromIDParam
                            }),
                            localeInfo && localeInfo.locales.length > 0 ? /*#__PURE__*/ _jsx(SelectLocales, {
                                locales: localeInfo.locales.map((l)=>({
                                        code: l.code,
                                        label: l.label
                                    })),
                                selected: selectedLocales
                            }) : null
                        ]
                    }),
                    /*#__PURE__*/ _jsx(RestoreVersion, {
                        collectionSlug: isGlobal ? undefined : entitySlug,
                        globalSlug: isGlobal ? entitySlug : undefined,
                        versionId: String(versionTo.id),
                        basePath: basePath,
                        draftsEnabled: draftsEnabled
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-3",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex flex-col gap-1",
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                className: "text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground",
                                children: "Before"
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "text-sm font-medium tabular-nums",
                                        children: fmt(versionFrom?.updatedAt) || '—'
                                    }),
                                    /*#__PURE__*/ _jsx(StatusPill, {
                                        status: fromStatus,
                                        t: i18n.t
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsx(ArrowRightIcon, {
                        className: "size-4 shrink-0 text-muted-foreground/60"
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex flex-col gap-1",
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                className: "text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground",
                                children: "After"
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "text-sm font-medium tabular-nums",
                                        children: fmt(versionTo.updatedAt)
                                    }),
                                    /*#__PURE__*/ _jsx(StatusPill, {
                                        status: toStatus,
                                        t: i18n.t
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),
            diffRows.length === 0 ? /*#__PURE__*/ _jsx("div", {
                className: "rounded-lg border border-dashed bg-card py-14 text-center text-sm text-muted-foreground",
                children: "No differences between these versions."
            }) : /*#__PURE__*/ _jsx("div", {
                className: "divide-y divide-border/50 overflow-hidden rounded-lg border bg-card",
                children: diffRows.map((row, i)=>/*#__PURE__*/ _jsx("div", {
                        className: "px-5 py-4",
                        children: row
                    }, i))
            })
        ]
    });
}

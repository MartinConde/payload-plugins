import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AutoDocFormBridge } from './AutoDocFormBridge.js';
import { DocViewTabs } from './DocViewTabs.js';
import { ViewShell } from 'payload-plugin-shadcn-ui';
import { extractCollection, stringifyLabel } from 'payload-plugin-shadcn-ui';
import { extractGlobal } from 'payload-plugin-shadcn-ui';
import { extractRichTextRenderedFields } from './richtext/extractRichTextRenderedFields.js';
const DOC_SLUG_MAPS_CACHE = new WeakMap();
const getDocSlugMaps = (config, i18n)=>{
    if (!config) return {
        useAsTitleBySlug: {},
        uploadCollectionsBySlug: {}
    };
    const langKey = i18n?.language ?? '__no-i18n__';
    let perLang = DOC_SLUG_MAPS_CACHE.get(config);
    if (!perLang) {
        perLang = new Map();
        DOC_SLUG_MAPS_CACHE.set(config, perLang);
    }
    const hit = perLang.get(langKey);
    if (hit) return hit;
    const useAsTitleBySlug = {};
    const uploadCollectionsBySlug = {};
    for (const c of config.collections ?? []){
        useAsTitleBySlug[c.slug] = c.admin?.useAsTitle;
        if (c.upload) {
            uploadCollectionsBySlug[c.slug] = extractCollection(c, i18n);
        }
    }
    const next = {
        useAsTitleBySlug,
        uploadCollectionsBySlug
    };
    perLang.set(langKey, next);
    return next;
};
const titleCase = (slug)=>slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
const pluralLabel = (collection)=>stringifyLabel(collection.labels?.plural) ?? titleCase(collection.slug);
const singularLabel = (collection)=>stringifyLabel(collection.labels?.singular) ?? titleCase(collection.slug);
/* Server component installed at admin.components.views.edit.default by the
   `defaultDocView` (collections) and `defaultGlobalView` (globals) plugin
   options. Covers BOTH create (no id) and edit (id present) modes for
   collections; globals are singletons (always edit-mode, no id, upsert).
   The create-vs-edit / collection-vs-global split lives in the client bridge.

   Mounted as `payload-plugin-shadcn-admin/rsc#AutoCollectionDocView`. */ export async function AutoCollectionDocView(serverProps) {
    const { initPageResult, doc } = serverProps;
    const collection = initPageResult?.collectionConfig;
    const global = initPageResult?.globalConfig;
    // Globals populate `globalConfig` instead of `collectionConfig` and never
    // carry a `docID` (singleton, routed by slug). When a global is present we
    // run a parallel branch that reuses the same bridge/field machinery.
    const isGlobal = Boolean(global) && !collection;
    const entity = isGlobal ? global : collection;
    const entitySlug = entity?.slug;
    const docID = initPageResult?.docID;
    // Field-level access control lives on `useDocumentInfo().docPermissions`
    // in the client (Payload's DocumentInfoProvider populates it before our
    // bridge mounts). The RSC wrapper has nothing to lift here — v3.7's
    // access-control hiding reads it directly inside the bridge.
    if (!entity || !entitySlug) {
        return /*#__PURE__*/ _jsx(ViewShell, {
            breadcrumbs: [
                {
                    label: serverProps.i18n.t('general:document')
                }
            ],
            children: /*#__PURE__*/ _jsxs("p", {
                className: "text-muted-foreground",
                children: [
                    "Could not resolve ",
                    isGlobal ? 'global' : 'collection',
                    " from server props."
                ]
            })
        });
    }
    const serializableCollection = isGlobal ? extractGlobal(global, serverProps.i18n) : extractCollection(collection, serverProps.i18n);
    const payload = serverProps.payload;
    // Both maps are derived purely from `payload.config.collections` (which
    // Payload only mutates at boot) and the admin language. Memoised by
    // (config, language) so RSC renders past the first don't re-walk every
    // collection's field tree via `extractCollection`. `extractCollection`
    // itself is also memoised at the shadcn-ui boundary, so the second-level
    // cost here is just the slug → useAsTitle scan.
    const { useAsTitleBySlug, uploadCollectionsBySlug } = getDocSlugMaps(payload?.config, serverProps.i18n);
    // v3.8 — localization plumbing. Read locales config from the sanitized
    // Payload config; when present (and multiple locales exist), the bridge
    // renders a LocaleSwitcher and partitions dirty/values per locale.
    const localizationConfig = payload?.config?.localization;
    let locales;
    let defaultLocale;
    let initialLocale;
    if (localizationConfig) {
        locales = localizationConfig.locales.map((loc)=>typeof loc === 'string' ? {
                code: loc,
                label: loc,
                rtl: false
            } : {
                code: loc.code,
                label: stringifyLabel(loc.label) ?? loc.code,
                rtl: Boolean(loc.rtl)
            });
        defaultLocale = localizationConfig.defaultLocale;
        // Active locale: URL `?locale=` is reflected on initPageResult.locale by
        // Payload's request pipeline; falls back to defaultLocale.
        initialLocale = initPageResult?.locale?.code ?? defaultLocale;
    }
    // Globals are singletons → always edit-mode (upsert). Collections split
    // create/edit on docID presence.
    const mode = isGlobal || docID !== undefined ? 'edit' : 'create';
    // v3.8 — when localization is configured with MORE THAN ONE locale AND we're
    // in edit mode, supplement Payload's upstream single-locale fetch with a
    // `?locale=all` refetch so initialValues carry every locale's value as
    // `{en, fr, …}` per localized field. Pre-rendered richText
    // `customComponents.Field` elements stay on their original (URL-active)
    // locale; the bridge pays a getFormState round-trip on the first locale
    // switch to refresh them.
    //
    // Single-locale sites: skip the refetch — the plain locale-resolved `doc`
    // already in initialValues is sufficient, and `locale:'all'` would return
    // locale-keyed objects that the bridge (activeLocale=null) can't unwrap.
    let initialValues = mode === 'edit' && doc && typeof doc === 'object' ? doc : {};
    if (mode === 'edit' && localizationConfig && payload && locales && locales.length > 1) {
        try {
            // CRITICAL: when drafts are enabled, pass `draft: true` so the refetch
            // returns the latest draft values (matching what Payload's own
            // `getDocumentData.js` does for `serverProps.doc`). Without this, the
            // refetch returns the PUBLISHED version, which means any draft-only
            // edits silently revert to empty on `router.refresh()` after a save.
            const draftsOn = Boolean(entity.versions?.drafts);
            const allLocalesDoc = isGlobal ? await payload.findGlobal({
                slug: entitySlug,
                locale: 'all',
                depth: 0,
                fallbackLocale: false,
                draft: draftsOn,
                req: initPageResult?.req,
                overrideAccess: false
            }) : docID !== undefined ? await payload.findByID({
                collection: entitySlug,
                id: docID,
                locale: 'all',
                depth: 0,
                fallbackLocale: false,
                draft: draftsOn,
                req: initPageResult?.req,
                overrideAccess: false
            }) : null;
            if (allLocalesDoc && typeof allLocalesDoc === 'object') {
                initialValues = allLocalesDoc;
            }
        } catch  {
        // Fall back to the single-locale `doc` already in initialValues.
        }
    }
    // Globals have no `useAsTitle`; the breadcrumb leaf is just the global label
    // (extractGlobal maps `global.label` → labels.singular).
    const globalLabel = serializableCollection.labels?.singular ?? titleCase(entitySlug);
    const useAsTitle = serializableCollection.admin?.useAsTitle;
    // Localized collections refetch `initialValues` with `locale: 'all'`, so the
    // useAsTitle field is a per-locale object `{ en: '…', fr: '…' }` rather than a
    // string. Resolve a display string (URL-active locale → default → any non-empty)
    // so the breadcrumb shows the title instead of falling back to the doc ID.
    const resolveTitleValue = (raw)=>{
        if (typeof raw === 'string') return raw || undefined;
        if (raw && typeof raw === 'object') {
            const obj = raw;
            for (const code of [
                initialLocale,
                defaultLocale
            ]){
                if (code && typeof obj[code] === 'string' && obj[code]) {
                    return obj[code];
                }
            }
            for (const v of Object.values(obj)){
                if (typeof v === 'string' && v) return v;
            }
        }
        return undefined;
    };
    const titleValue = useAsTitle ? resolveTitleValue(initialValues[useAsTitle]) : undefined;
    const editTitle = isGlobal ? globalLabel : mode === 'edit' ? titleValue ?? String(docID) : null;
    // Lift Payload's pre-built richText Field elements out of formState. Payload's
    // DocumentView pipeline ran renderField for every field before invoking us;
    // for richText fields that produces a fully-resolved <RichTextField/> element
    // (with all heavy lexical props baked in) at
    // formState[path].customComponents.Field. The bridge mounts each one inside
    // a small Form shim. See richtext/extractRichTextRenderedFields.ts.
    const initialRichTextRendered = extractRichTextRenderedFields(serializableCollection, initialValues, serverProps.formState);
    const operation = mode === 'edit' ? 'update' : 'create';
    // Initial upload preview for edit mode on upload collections. Payload's
    // upload-collection docs always carry these flat fields when a file is
    // present; we pass them through to the bridge so the header can render a
    // thumbnail without an extra round trip. Create mode passes null.
    const isUpload = Boolean(serializableCollection.upload);
    const initialUploadDoc = isUpload && mode === 'edit' && doc && typeof doc === 'object' ? {
        url: typeof doc.url === 'string' ? doc.url : '',
        thumbnailURL: typeof doc.thumbnailURL === 'string' ? doc.thumbnailURL : null,
        filename: typeof doc.filename === 'string' ? doc.filename : null,
        mimeType: typeof doc.mimeType === 'string' ? doc.mimeType : null,
        filesize: typeof doc.filesize === 'number' ? doc.filesize : null,
        width: typeof doc.width === 'number' ? doc.width : null,
        height: typeof doc.height === 'number' ? doc.height : null,
        crop: doc.crop && typeof doc.crop === 'object' ? doc.crop : null,
        focalPoint: doc.focalPoint && typeof doc.focalPoint === 'object' ? doc.focalPoint : null
    } : null;
    const hasVersions = Boolean(serializableCollection.versions);
    const t = serverProps.i18n.t;
    const breadcrumbs = isGlobal ? [
        {
            label: t('general:globals')
        },
        {
            label: globalLabel,
            href: `/admin/globals/${entitySlug}`
        }
    ] : [
        {
            label: t('general:collections')
        },
        {
            label: pluralLabel(collection),
            href: `/admin/collections/${entitySlug}`
        },
        {
            label: mode === 'create' ? t('general:createNewLabel', {
                label: singularLabel(collection)
            }) : editTitle ?? t('general:edit')
        }
    ];
    return /*#__PURE__*/ _jsx(ViewShell, {
        className: "shadcn-auto-doc-view",
        headerActions: isGlobal || mode === 'edit' ? /*#__PURE__*/ _jsx(DocViewTabs, {
            hasVersions: hasVersions
        }) : undefined,
        breadcrumbs: breadcrumbs,
        children: /*#__PURE__*/ _jsx(AutoDocFormBridge, {
            mode: mode,
            collectionSlug: isGlobal ? undefined : entitySlug,
            globalSlug: isGlobal ? entitySlug : undefined,
            docId: docID,
            collection: serializableCollection,
            useAsTitleBySlug: useAsTitleBySlug,
            uploadCollectionsBySlug: uploadCollectionsBySlug,
            initialValues: initialValues,
            initialRichTextRendered: initialRichTextRendered,
            operation: operation,
            initialUploadDoc: initialUploadDoc,
            locales: locales,
            defaultLocale: defaultLocale,
            initialLocale: initialLocale
        })
    });
}

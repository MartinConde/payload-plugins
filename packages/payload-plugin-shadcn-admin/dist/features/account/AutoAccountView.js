import { jsx as _jsx } from "react/jsx-runtime";
import { docAccessOperation } from '../../internal/payloadAdapter.js';
import { ViewShell } from 'payload-plugin-shadcn-ui';
import { extractCollection } from 'payload-plugin-shadcn-ui';
import { AccountForm } from './AccountForm.js';
/* RSC installed at `admin.components.views.account` by the `defaultAuthViews`
   plugin option. Account is post-auth and lives inside the sidebar shell, so it
   renders through `ViewShell` with the `.shadcn-auto-doc-view` marker (which
   hides Payload's default doc header via styles.css). It resolves the logged-in
   user's full record + field permissions server-side and hands them to the
   client AccountForm. Mounted as
   `payload-plugin-shadcn-admin/rsc#AutoAccountView`. */ export async function AutoAccountView({ initPageResult }) {
    const { permissions, req } = initPageResult;
    const { i18n, payload, user } = req;
    const userSlug = payload.config.admin.user;
    const collectionConfig = payload.collections?.[userSlug]?.config;
    if (!collectionConfig || !user) {
        return /*#__PURE__*/ _jsx(ViewShell, {
            className: "shadcn-auto-doc-view",
            breadcrumbs: [
                {
                    label: i18n.t('authentication:account')
                }
            ],
            children: /*#__PURE__*/ _jsx("p", {
                className: "text-muted-foreground",
                children: i18n.t('error:unauthorized')
            })
        });
    }
    // Re-read the current user with the request's own access so we get readable
    // sensitive fields (apiKey, _verified) the cached `req.user` may omit.
    let doc = user;
    try {
        const fetched = await payload.findByID({
            collection: userSlug,
            id: user.id,
            depth: 0,
            req,
            overrideAccess: false
        });
        if (fetched && typeof fetched === 'object') {
            doc = fetched;
        }
    } catch  {
    // Fall back to req.user.
    }
    const extracted = extractCollection(collectionConfig, i18n);
    const useAsTitleBySlug = {};
    for (const c of payload.config.collections ?? []){
        useAsTitleBySlug[c.slug] = c.admin?.useAsTitle;
    }
    // Admin-language options for the account language selector, mirroring
    // Payload's own Root layout: one entry per supported language, labelled with
    // that language's own `general:thisLanguage` string. The custom AccountForm
    // replaces Payload's native account view (which carries the language picker),
    // so we surface the equivalent control here.
    const supportedLanguages = payload.config.i18n?.supportedLanguages ?? {};
    const languageOptions = Object.entries(supportedLanguages).map(([code, cfg])=>({
            value: code,
            label: cfg?.translations?.general?.thisLanguage ?? code
        }));
    const auth = collectionConfig.auth;
    const useAPIKey = typeof auth === 'object' ? Boolean(auth.useAPIKey) : false;
    const verify = typeof auth === 'object' ? Boolean(auth.verify) : false;
    // Doc-scoped field permissions — same source Payload's own AccountView uses
    // (`getDocumentPermissions` → `docAccessOperation`). The `.fields` map this
    // returns is what FieldList's canRead/canUpdate gate on; the collection-wide
    // `initPageResult.permissions` is a less precise fallback.
    let docPermissions = permissions?.collections?.[userSlug];
    try {
        docPermissions = await docAccessOperation({
            id: user.id,
            collection: payload.collections[userSlug],
            data: {
                ...doc,
                _status: 'draft'
            },
            req
        });
    } catch  {
    // Fall back to the collection-wide sanitized permissions.
    }
    return /*#__PURE__*/ _jsx(ViewShell, {
        className: "shadcn-auto-doc-view",
        breadcrumbs: [
            {
                label: i18n.t('authentication:account')
            }
        ],
        children: /*#__PURE__*/ _jsx(AccountForm, {
            userSlug: userSlug,
            userId: user.id,
            languageOptions: languageOptions,
            fields: extracted.fields,
            initialValues: doc,
            useAsTitleBySlug: useAsTitleBySlug,
            docPermissions: docPermissions,
            useAPIKey: useAPIKey,
            verify: verify,
            verified: Boolean(doc._verified),
            initialApiKey: typeof doc.apiKey === 'string' ? doc.apiKey : null,
            initialEnableAPIKey: Boolean(doc.enableAPIKey)
        })
    });
}

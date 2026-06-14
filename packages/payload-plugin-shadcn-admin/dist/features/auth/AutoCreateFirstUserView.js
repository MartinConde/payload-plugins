import { jsx as _jsx } from "react/jsx-runtime";
import { extractCollection } from 'payload-plugin-shadcn-ui';
import { CreateFirstUserForm } from './CreateFirstUserForm.js';
/* Seed top-level static field defaults so the first-user form starts from the
   collection's `defaultValue`s (e.g. `roles: ['editor']`). Mirrors the bridge's
   create-mode seeding; transparent containers (row/collapsible) flatten, named
   tabs/groups are left to the user. */ const seedDefaults = (fields)=>{
    const out = {};
    for (const f of fields){
        if (f.type === 'row' || f.type === 'collapsible') {
            if (f.fields) Object.assign(out, seedDefaults(f.fields));
            continue;
        }
        if (!f.name) continue;
        if (f.defaultValue !== undefined) out[f.name] = f.defaultValue;
    }
    return out;
};
/* RSC installed at `admin.components.views.createFirstUser`. Extracts the user
   collection's serializable fields + defaults and mounts the shadcn first-user
   form. Mounted as `payload-plugin-shadcn-admin/rsc#AutoCreateFirstUserView`. */ export function AutoCreateFirstUserView({ initPageResult }) {
    const { req } = initPageResult;
    const { payload, i18n } = req;
    const userSlug = payload.config.admin.user;
    const collectionConfig = payload.collections?.[userSlug]?.config;
    if (!collectionConfig) {
        return null;
    }
    const extracted = extractCollection(collectionConfig, i18n);
    const useAsTitleBySlug = {};
    for (const c of payload.config.collections ?? []){
        useAsTitleBySlug[c.slug] = c.admin?.useAsTitle;
    }
    return /*#__PURE__*/ _jsx(CreateFirstUserForm, {
        fields: extracted.fields,
        initialValues: seedDefaults(extracted.fields),
        useAsTitleBySlug: useAsTitleBySlug,
        userSlug: userSlug
    });
}

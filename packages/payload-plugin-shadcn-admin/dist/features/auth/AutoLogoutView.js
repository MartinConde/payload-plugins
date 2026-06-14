import { jsx as _jsx } from "react/jsx-runtime";
import { LogoutClient } from './LogoutClient.js';
/* RSC installed at `admin.components.views.logout`. Mirrors Payload's
   `LogoutView` — mounts the client logout handler with the optional `redirect`
   query param. `AutoLogoutInactivityView` is the `/logout-inactivity` variant
   (registered under the `inactivity` route key).
   Mounted as `payload-plugin-shadcn-admin/rsc#AutoLogoutView`. */ export function AutoLogoutView({ searchParams }) {
    const redirect = typeof searchParams?.redirect === 'string' ? searchParams.redirect : undefined;
    return /*#__PURE__*/ _jsx(LogoutClient, {
        redirect: redirect
    });
}
export function AutoLogoutInactivityView({ searchParams }) {
    const redirect = typeof searchParams?.redirect === 'string' ? searchParams.redirect : undefined;
    return /*#__PURE__*/ _jsx(LogoutClient, {
        inactivity: true,
        redirect: redirect
    });
}

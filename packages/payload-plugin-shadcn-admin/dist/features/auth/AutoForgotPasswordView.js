import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatAdminURL } from '../../internal/payloadAdapter.js';
import { AuthShell } from 'payload-plugin-shadcn-ui';
import { Button } from 'payload-plugin-shadcn-ui';
import { ForgotPasswordForm } from './ForgotPasswordForm.js';
/* RSC installed at `admin.components.views.forgot`. When a user is already
   authenticated, mirrors Payload by showing an "already logged in" notice with
   a link to the account view; otherwise mounts the shadcn forgot-password form.
   Mounted as `payload-plugin-shadcn-admin/rsc#AutoForgotPasswordView`. */ export function AutoForgotPasswordView({ initPageResult }) {
    const { req } = initPageResult;
    const { i18n, user, payload } = req;
    const { routes: { admin: adminRoute } } = payload.config;
    const accountRoute = payload.config.admin.routes.account;
    if (user) {
        return /*#__PURE__*/ _jsxs(AuthShell, {
            title: i18n.t('authentication:alreadyLoggedIn'),
            description: i18n.t('authentication:loggedInChangePassword'),
            children: [
                /*#__PURE__*/ _jsx(Button, {
                    asChild: true,
                    className: "w-full",
                    children: /*#__PURE__*/ _jsx("a", {
                        href: formatAdminURL({
                            adminRoute,
                            path: accountRoute
                        }),
                        children: i18n.t('authentication:account')
                    })
                }),
                /*#__PURE__*/ _jsx(Button, {
                    asChild: true,
                    variant: "outline",
                    className: "w-full",
                    children: /*#__PURE__*/ _jsx("a", {
                        href: adminRoute,
                        children: i18n.t('general:backToDashboard')
                    })
                })
            ]
        });
    }
    return /*#__PURE__*/ _jsx(ForgotPasswordForm, {});
}

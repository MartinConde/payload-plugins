import * as React from 'react';
export type NavUserUser = {
    name: string;
    email: string;
    avatar?: string;
};
type NavUserProps = {
    user: NavUserUser;
    /** Defaults to `/admin/account`. Set to null to hide the account item. */
    accountHref?: string | null;
    /** Defaults to `/admin/logout`. Set to null to hide the logout item. */
    logoutHref?: string | null;
    /** Extra menu items rendered between the account link and the logout row. */
    extraItems?: React.ReactNode;
};
export declare function NavUser({ user, accountHref, logoutHref, extraItems }: NavUserProps): import("react/jsx-runtime").JSX.Element;
export {};

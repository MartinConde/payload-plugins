import * as React from 'react';
export type NavUserUser = {
    name: string;
    email: string;
    avatar?: string;
};
type NavUserProps = {
    user: NavUserUser;
    /** Defaults to `/admin/logout`. Set to null to hide the logout item. */
    logoutHref?: string | null;
    /** Extra menu items rendered between the user label and the logout row. */
    extraItems?: React.ReactNode;
};
export declare function NavUser({ user, logoutHref, extraItems }: NavUserProps): import("react/jsx-runtime").JSX.Element;
export {};

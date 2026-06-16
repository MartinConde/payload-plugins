import * as React from 'react';
import { type SidebarCollectionItem } from './CollectionsSidebarGroup.js';
import { type NavUserUser } from './NavUser.js';
import { Sidebar } from 'payload-plugin-shadcn-ui';
export type IconRef = string | React.ComponentType<{
    className?: string;
}>;
/** @deprecated alias for IconRef — retained for older consumer code. */
export type IconComponent = IconRef;
export type AdminBranding = {
    /** Top-line label (e.g. "CMS", your product name). */
    name: string;
    /** Optional subtitle under the name. Defaults to "Payload admin". */
    subtitle?: string;
    /** Lucide icon name (string) or a component with `className`. See IconRef. */
    icon?: IconRef;
    /** Where the branding tile links to. Defaults to `/admin`. */
    href?: string;
};
export type NavItem = {
    /** Visible label. Required. */
    label: string;
    /** Explicit href. Takes precedence over `collectionSlug` / `globalSlug`. */
    href?: string;
    /** Shortcut: resolves to `/admin/collections/{slug}`. */
    collectionSlug?: string;
    /** Shortcut: resolves to `/admin/globals/{slug}`. */
    globalSlug?: string;
    /** Optional icon — lucide name string or component. */
    icon?: IconRef;
    /** Sub-items render as a `<Collapsible>` with `<SidebarMenuSub>` children.
     *  When provided, the parent itself toggles the collapsible (no nav). */
    items?: NavItem[];
};
export type NavGroup = {
    /** Optional section header (e.g. "Platform"). Omit for an unlabelled group. */
    label?: string;
    items: NavItem[];
};
type DefaultAdminSidebarProps = Omit<React.ComponentProps<typeof Sidebar>, 'children'> & {
    user: NavUserUser;
    branding?: AdminBranding;
    /** Explicit sidebar tree. When provided, replaces the default flat
     *  collections list. */
    groups?: NavGroup[];
    /** Legacy: flat list of collections. Used as the default group when
     *  `groups` is not provided. */
    collections?: SidebarCollectionItem[];
    /** Optional extra content rendered inside `<SidebarContent>` after the
     *  primary groups (e.g. consumer-defined custom links). */
    children?: React.ReactNode;
    /** When set, renders a "Rebuild Frontend" button in the sidebar footer
     *  above the user menu. Provided by the plugin when `rebuildFrontend`
     *  is enabled in the plugin options. */
    rebuildFrontend?: {
        label: string;
        endpointPath: string;
    };
};
export declare function DefaultAdminSidebar({ user, branding, groups, collections, children, rebuildFrontend, collapsible, ...sidebarProps }: DefaultAdminSidebarProps): import("react/jsx-runtime").JSX.Element;
export {};

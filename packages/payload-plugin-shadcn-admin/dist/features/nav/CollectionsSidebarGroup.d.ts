import { type LucideIcon } from 'lucide-react';
export type SidebarCollectionItem = {
    slug: string;
    label: string;
    href?: string;
    icon?: LucideIcon;
};
type CollectionsSidebarGroupProps = {
    collections: SidebarCollectionItem[];
    /** Group label shown above the list. Pass `null` to omit. Defaults to "Collections". */
    label?: string | null;
    /** Fallback icon for items without one. Defaults to lucide's Database. */
    defaultIcon?: LucideIcon;
};
export declare function CollectionsSidebarGroup({ collections, label, defaultIcon: DefaultIcon, }: CollectionsSidebarGroupProps): import("react/jsx-runtime").JSX.Element;
export {};

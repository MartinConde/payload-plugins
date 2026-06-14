import type { SidebarCollectionItem } from '../features/nav/CollectionsSidebarGroup.js';
type PayloadCollectionLike = {
    slug: string;
    labels?: {
        singular?: unknown;
        plural?: unknown;
    } | null;
    admin?: {
        hidden?: unknown;
    } | null;
};
type PayloadGlobalLike = {
    slug: string;
    label?: unknown;
    admin?: {
        hidden?: unknown;
    } | null;
};
type PayloadConfigLike = {
    collections?: ReadonlyArray<PayloadCollectionLike>;
    globals?: ReadonlyArray<PayloadGlobalLike>;
};
export declare function collectionsFromPayloadConfig(config: PayloadConfigLike): SidebarCollectionItem[];
export declare function globalsFromPayloadConfig(config: PayloadConfigLike): SidebarCollectionItem[];
export {};

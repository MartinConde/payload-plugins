export type FieldMeta = {
    type: string;
    name?: string;
    label?: unknown;
    hidden?: boolean;
    hasMany?: boolean;
    relationTo?: string | string[];
    admin?: {
        hidden?: boolean;
        disableListColumn?: boolean;
        [k: string]: unknown;
    } | null;
    [k: string]: unknown;
};
export type CollectionMeta = {
    slug: string;
    admin?: {
        useAsTitle?: string;
        defaultColumns?: ReadonlyArray<string>;
        [k: string]: unknown;
    } | null;
    fields: ReadonlyArray<FieldMeta>;
};
export declare function flattenFields<T extends FieldMeta>(fields: ReadonlyArray<T>): T[];
export declare function findFieldByName<T extends FieldMeta>(fields: ReadonlyArray<T>, name: string): T | undefined;
export declare function pickFieldNames(collection: CollectionMeta): string[];
export declare function buildListSelect(collection: CollectionMeta): Record<string, true>;
export declare function buildListPopulate(collection: CollectionMeta, useAsTitleBySlug: Record<string, string | undefined>): Record<string, Record<string, true>> | undefined;
export declare function collectionNeedsDepthOne(collection: CollectionMeta): boolean;

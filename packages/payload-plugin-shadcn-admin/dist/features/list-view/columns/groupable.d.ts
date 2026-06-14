import type { CollectionMeta } from './fieldPicker.js';
export declare const GROUPABLE_TYPES: Set<string>;
export type GroupableField = {
    name: string;
    label: string;
    type: string;
};
/** Top-level fields offered in the "Group by" picker. */
export declare function getGroupableFields(collection: CollectionMeta): GroupableField[];

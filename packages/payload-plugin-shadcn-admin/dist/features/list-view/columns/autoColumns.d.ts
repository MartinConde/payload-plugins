import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';
import { type CollectionMeta, type FieldMeta } from './fieldPicker.js';
type AutoField = FieldMeta & {
    options?: ReadonlyArray<string | {
        label?: unknown;
        value: string | number;
    }>;
    /** array-field labels — used by the auto cell to render
     *  "{N} {singular|plural}" when set. */
    labels?: {
        singular?: string | null;
        plural?: string | null;
    } | null;
    admin?: {
        hidden?: boolean;
        disableListColumn?: boolean;
        date?: {
            displayFormat?: string;
        };
        [k: string]: unknown;
    } | null;
    custom?: Record<string, any> | null;
};
type AutoCollection = CollectionMeta & {
    fields: ReadonlyArray<AutoField>;
};
export type BuildColumnsOptions = {
    collection: AutoCollection;
    /** Map of related-collection slug → its useAsTitle, used by relationship
     *  cells to render the related doc's title. Passed as a plain object so it
     *  survives RSC→Client serialization. */
    useAsTitleBySlug?: Record<string, string | undefined>;
    /** v3.20 — column field names that carry a native `admin.components.Cell`.
     *  Their cells are pre-rendered server-side (see `renderNativeCells`). */
    nativeCellFieldNames?: ReadonlyArray<string>;
    /** v3.20 — `[rowId][fieldName]` → server-rendered native cell node. */
    nativeCellsByRow?: Record<string, Record<string, React.ReactNode>>;
};
export declare function buildColumnsForCollection({ collection, useAsTitleBySlug, nativeCellFieldNames, nativeCellsByRow, }: BuildColumnsOptions): ColumnDef<any, any>[];
export {};

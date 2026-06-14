import type { ReactNode } from 'react';
import type { ListViewServerProps } from '../../../internal/payloadAdapter.js';
import type { ExtractedField } from 'payload-plugin-shadcn-ui';
type RawField = {
    name?: string;
    type?: string;
    admin?: {
        components?: {
            Cell?: unknown;
        } | null;
    } | null;
};
type RawCollection = {
    fields?: ReadonlyArray<RawField>;
    [k: string]: unknown;
};
export type NativeCells = {
    /** Top-level column field names that carry a native `admin.components.Cell`. */
    fieldNames: string[];
    /** `[rowId][fieldName]` → server-rendered cell node. */
    byRow: Record<string, Record<string, ReactNode>>;
};
export declare function renderNativeCells({ collection, extractedFields, columnNames, docs, payload, i18n, collectionSlug, viewType, }: {
    /** The RAW (un-extracted) collection config — carries `admin.components`. */
    collection: RawCollection;
    /** The serializable extracted fields, used as the client-safe `field` prop. */
    extractedFields: ReadonlyArray<ExtractedField>;
    /** Names selected as columns (so we only render cells that are shown). */
    columnNames: ReadonlyArray<string>;
    docs: ReadonlyArray<{
        id: number | string;
        [k: string]: unknown;
    }>;
    payload: ListViewServerProps['payload'];
    i18n: ListViewServerProps['i18n'];
    collectionSlug: string;
    viewType: ListViewServerProps['viewType'];
}): NativeCells;
export {};

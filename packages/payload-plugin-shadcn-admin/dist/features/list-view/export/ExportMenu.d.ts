import * as React from 'react';
import type { Table as TanstackTable } from '@tanstack/react-table';
import type { FieldMeta } from '../columns/fieldPicker.js';
export type ExportMenuProps<TData extends {
    id: number | string;
}> = {
    table: TanstackTable<TData>;
    collectionSlug: string;
    /** Serializable field metadata from the consumer collection. When
     *  present, used as the source of truth for candidate fields and
     *  labels. When absent, falls back to the table's leaf columns. */
    fields?: ReadonlyArray<FieldMeta>;
};
export declare function ExportMenu<TData extends {
    id: number | string;
}>({ table, collectionSlug, fields, }: ExportMenuProps<TData>): React.ReactElement;

import * as React from 'react';
import type { FieldMeta } from '../columns/fieldPicker.js';
export type ExportScope = 'selected' | 'filtered' | 'all';
export type ExportFieldChoice = {
    id: string;
    label: string;
    field?: FieldMeta;
};
export type FieldPickerSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scope: ExportScope;
    collectionSlug: string;
    /** Ordered candidate fields (locked ids like `select` excluded). */
    candidates: ExportFieldChoice[];
    /** Ids initially checked. Order does not matter; checked-ids inherit `candidates` order on export. */
    initialSelectedIds: ReadonlyArray<string>;
    /** Ids of currently selected rows (only used when scope === 'selected'). */
    selectedRowIds: ReadonlyArray<string | number>;
    /** Soft cap for total rows exported before we ask to continue. */
    rowSoftCap?: number;
};
export declare function FieldPickerSheet({ open, onOpenChange, scope, collectionSlug, candidates, initialSelectedIds, selectedRowIds, rowSoftCap, }: FieldPickerSheetProps): React.ReactElement;

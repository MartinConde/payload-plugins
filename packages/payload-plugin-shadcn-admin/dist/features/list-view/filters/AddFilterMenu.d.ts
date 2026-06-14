import * as React from 'react';
import type { FieldMeta } from '../columns/fieldPicker.js';
import { type FilterChip } from './filterCodec.js';
type Props = {
    fields: ReadonlyArray<FieldMeta>;
    onAdd: (chip: Omit<FilterChip, 'id'>) => void;
};
export declare function AddFilterMenu({ fields, onAdd }: Props): React.ReactElement;
export {};

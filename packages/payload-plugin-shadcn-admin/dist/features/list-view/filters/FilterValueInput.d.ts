import * as React from 'react';
import type { FieldMeta } from '../columns/fieldPicker.js';
import { type FilterValue, type WhereOperator } from './filterCodec.js';
type Props = {
    field: FieldMeta;
    operator: WhereOperator;
    value: FilterValue;
    useAsTitleBySlug?: Record<string, string | undefined>;
    onChange: (value: FilterValue) => void;
};
export declare function FilterValueInput({ field, operator, value, useAsTitleBySlug, onChange, }: Props): React.ReactElement | null;
export {};

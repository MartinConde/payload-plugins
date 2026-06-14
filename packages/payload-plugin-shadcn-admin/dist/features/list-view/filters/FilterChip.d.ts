import * as React from 'react';
import type { FieldMeta } from '../columns/fieldPicker.js';
import { type FilterChip as FilterChipData } from './filterCodec.js';
type Props = {
    chip: FilterChipData;
    fields: ReadonlyArray<FieldMeta>;
    useAsTitleBySlug?: Record<string, string | undefined>;
    isInOrGroup: boolean;
    isFirstNode: boolean;
    canMoveLeft: boolean;
    canMoveRight: boolean;
    onChange: (patch: Partial<Omit<FilterChipData, 'id'>>) => void;
    onRemove: () => void;
    onMove: (direction: -1 | 1) => void;
    onToggleOrJoin: () => void;
    defaultOpen?: boolean;
};
export declare function FilterChip({ chip, fields, useAsTitleBySlug, isInOrGroup, isFirstNode, canMoveLeft, canMoveRight, onChange, onRemove, onMove, onToggleOrJoin, defaultOpen, }: Props): React.ReactElement;
export {};

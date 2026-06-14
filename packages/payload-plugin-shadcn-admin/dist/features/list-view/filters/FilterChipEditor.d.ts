import * as React from 'react';
import type { FieldMeta } from '../columns/fieldPicker.js';
import { type FilterChip } from './filterCodec.js';
type Props = {
    chip: FilterChip;
    fields: ReadonlyArray<FieldMeta>;
    useAsTitleBySlug?: Record<string, string | undefined>;
    isInOrGroup: boolean;
    isFirstNode: boolean;
    canMoveLeft: boolean;
    canMoveRight: boolean;
    onChange: (patch: Partial<Omit<FilterChip, 'id'>>) => void;
    onRemove: () => void;
    onMove: (direction: -1 | 1) => void;
    onToggleOrJoin: () => void;
};
export declare function FilterChipEditor({ chip, fields, useAsTitleBySlug, isInOrGroup, isFirstNode, canMoveLeft, canMoveRight, onChange, onRemove, onMove, onToggleOrJoin, }: Props): React.ReactElement;
export {};

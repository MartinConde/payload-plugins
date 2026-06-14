import * as React from 'react';
import { type FieldInputField, type FieldInputOption } from '../../doc-form/inputs/FieldInput.js';
export type BulkEditSelectOption = FieldInputOption;
export type BulkEditField = FieldInputField;
type Props = {
    field: BulkEditField;
    value: unknown;
    isDirty: boolean;
    useAsTitleBySlug: Record<string, string | undefined>;
    onChange: (value: unknown) => void;
    onReset: () => void;
};
export declare const isBulkEditable: (field: BulkEditField) => boolean;
export declare function BulkEditFieldInput({ field, value, isDirty, useAsTitleBySlug, onChange, onReset, }: Props): React.ReactElement;
export {};

import * as React from 'react';
import type { ExtractedField } from 'payload-plugin-shadcn-ui';
type Row = {
    id: string;
    [key: string]: unknown;
};
export type ArrayInputProps = {
    id?: string;
    field: ExtractedField;
    value: unknown;
    onChange: (next: Row[]) => void;
    nestedPath: string;
    renderChild: (child: ExtractedField, pathPrefix: string, parentPerms?: unknown, inheritedReadOnly?: boolean) => React.ReactNode;
    disabled?: boolean;
    /** v3.7: the FieldPermissions object for this array field itself — its
     *  `.fields` map gates per-row subfields. */
    rowPerms?: unknown;
};
export declare function ArrayInput({ id, field, value, onChange, nestedPath, renderChild, disabled, rowPerms, }: ArrayInputProps): React.ReactElement;
declare function SortableRow({ row, index, disabled, onRemove, children, header, }: {
    row: Row;
    index: number;
    disabled?: boolean;
    onRemove: () => void;
    children: React.ReactNode;
    header?: React.ReactNode;
}): React.ReactElement;
export { SortableRow };

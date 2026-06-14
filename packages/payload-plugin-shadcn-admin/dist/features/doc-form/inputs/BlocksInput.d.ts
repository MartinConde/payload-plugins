import * as React from 'react';
import type { ExtractedField } from 'payload-plugin-shadcn-ui';
import type { Perms } from '../access-control/fieldPermissions.js';
type BlockRow = {
    id: string;
    blockType: string;
    [key: string]: unknown;
};
export type BlocksInputProps = {
    id?: string;
    field: ExtractedField;
    value: unknown;
    onChange: (next: BlockRow[]) => void;
    nestedPath: string;
    renderChild: (child: ExtractedField, pathPrefix: string, parentPerms?: unknown, inheritedReadOnly?: boolean) => React.ReactNode;
    disabled?: boolean;
    /** v3.7: the FieldPermissions object for this blocks field itself; its
     *  `.blocks[slug].fields` map gates per-block subfields. */
    blockPerms?: Perms;
};
export declare function BlocksInput({ id, field, value, onChange, nestedPath, renderChild, disabled, blockPerms, }: BlocksInputProps): React.ReactElement;
export {};

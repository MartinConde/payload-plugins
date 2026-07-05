import * as React from 'react';
import type { ExtractedBlock, ExtractedField } from 'payload-plugin-shadcn-ui';
import type { Perms } from '../access-control/fieldPermissions.js';
export type BlockRow = {
    id: string;
    blockType: string;
    [key: string]: unknown;
};
/** Builds a fresh row for `block`: a random `id`, `blockType: block.slug`, and
 *  each subfield's `defaultValue` (undefined ones are simply absent, matching
 *  how Payload itself omits unset fields rather than writing explicit nulls).
 *  Exported so the page-builder's "add block" action (driven from the Live
 *  Preview toolbar, not this component) constructs new rows the same way. */
export declare const newRow: (block: ExtractedBlock) => BlockRow;
/** Defensively normalizes a raw layout row to `{id, blockType, ...}` (a legacy
 *  row missing an `id`, or with a numeric one, gets a stable string id).
 *  Exported so the page-builder settings panel normalizes `values.layout`
 *  the same way this component does, keeping both readings of the array
 *  in agreement on row identity. */
export declare const ensureRowId: (row: Record<string, unknown>) => BlockRow;
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

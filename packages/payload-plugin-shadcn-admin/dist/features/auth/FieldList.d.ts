import * as React from 'react';
import { type Perms } from '../doc-form/access-control/fieldPermissions.js';
import type { ExtractedField } from 'payload-plugin-shadcn-ui';
export declare const getByPath: (root: unknown, path: string) => unknown;
/** Immutably set `value` at a dotted path, cloning only the touched spine. */
export declare const setByPath: (root: Record<string, unknown>, path: string, next: unknown) => Record<string, unknown>;
export type FieldListProps = {
    fields: ExtractedField[];
    values: Record<string, unknown>;
    errors: Record<string, string>;
    onChange: (path: string, value: unknown) => void;
    useAsTitleBySlug: Record<string, string | undefined>;
    docPermissions?: Perms;
    disabled?: boolean;
    operation?: 'create' | 'update';
};
export declare function FieldList({ fields, values, errors, onChange, useAsTitleBySlug, docPermissions, disabled, operation, }: FieldListProps): React.ReactElement;

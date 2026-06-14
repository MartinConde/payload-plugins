import * as React from 'react';
import type { ExtractedCollection, ExtractedField } from 'payload-plugin-shadcn-ui';
import { type Perms } from '../access-control/fieldPermissions.js';
import type { RichTextRenderedMap } from '../richtext/extractRichTextRenderedFields.js';
export type FieldTreeDeps = {
    /** Doc-root value tree. Localized leaves hold `{locale: value}` objects. */
    values: Record<string, unknown>;
    /** Path-keyed inline error messages. */
    errors: Record<string, string>;
    /** Active locale, or null when localization is off. */
    activeLocale: string | null;
    localizationEnabled: boolean;
    /** Disables every input (e.g. while submitting). */
    disabled: boolean;
    /** Single write seam: replace the value at a dotted path. */
    setValueAtPath: (path: string, next: unknown) => void;
    /** Pre-rendered Payload richText Field elements, keyed by dotted path. */
    richTextRendered: RichTextRenderedMap;
    useAsTitleBySlug: Record<string, string | undefined>;
    /** Serializable metadata for every upload collection, keyed by slug.
     *  Forwarded to FieldInput → UploadFieldInput for the custom upload dialog. */
    uploadCollectionsBySlug?: Record<string, ExtractedCollection>;
    operation: 'create' | 'update';
    /** Class applied to each leaf wrapper. Defaults to a stacked column. */
    fieldWrapperClassName?: string;
    /** When true, render the field label + required marker + lock icon. The
     *  bulk drawer renders its own chrome and sets this false. */
    showFieldChrome?: boolean;
    /** Prefix for the per-input DOM id (e.g. `doc-form-` / `bulk-edit-`). */
    idPrefix?: string;
};
export type FieldTreeRenderer = {
    renderField: (field: ExtractedField, pathPrefix: string, parentPerms?: Perms, 
    /** Forces this field (and its inputs) read-only regardless of access —
     *  set when a parent container is read-only so it cascades to children. */
    inheritedReadOnly?: boolean) => React.ReactNode;
    renderChild: (child: ExtractedField, pathPrefix: string, parentPerms?: Perms, inheritedReadOnly?: boolean) => React.ReactNode;
};
export declare function makeFieldTreeRenderer(deps: FieldTreeDeps): FieldTreeRenderer;

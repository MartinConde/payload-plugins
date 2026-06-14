import * as React from 'react';
import type { TFunction } from '../../../internal/payloadAdapter.js';
import type { ExtractedBlock, ExtractedCollection, ExtractedField, ExtractedTab } from 'payload-plugin-shadcn-ui';
import type { RichTextRenderedEntry } from '../richtext/extractRichTextRenderedFields.js';
export type FieldInputOption = string | {
    value: string;
    label: string;
};
export type FieldInputField = {
    type: string;
    name: string;
    label?: string | null;
    hidden?: boolean;
    hasMany?: boolean;
    relationTo?: string | string[];
    options?: FieldInputOption[];
    admin?: {
        hidden?: boolean;
        disableBulkEdit?: boolean;
        description?: string;
        date?: {
            displayFormat?: string;
        };
        language?: string;
    } | null;
    custom?: Record<string, unknown>;
    fields?: ExtractedField[];
    blocks?: ExtractedBlock[];
    tabs?: ExtractedTab[];
};
export type FieldInputProps = {
    field: FieldInputField;
    value: unknown;
    useAsTitleBySlug: Record<string, string | undefined>;
    /** Serializable metadata for every upload collection, keyed by slug. Only
     *  upload fields consume it (for the custom UploadNewDialog); defaults to `{}`
     *  so non-upload callers (bulk-edit, auth) need not supply it. */
    uploadCollectionsBySlug?: Record<string, ExtractedCollection>;
    onChange: (value: unknown) => void;
    id?: string;
    required?: boolean;
    invalid?: boolean;
    disabled?: boolean;
    nestedPath?: string;
    renderChild?: (child: ExtractedField, pathPrefix: string, parentPerms?: unknown) => React.ReactNode;
    /** Pre-rendered Payload Field element + initial value for richText fields,
     *  lifted from serverProps.formState. Looked up by nestedPath in the bridge
     *  and passed in here. Absent → either not a richText field, or rebuild
     *  in flight for a freshly-added array/blocks row. */
    richTextRendered?: RichTextRenderedEntry;
    operation?: 'create' | 'update';
    /** Active locale code (null when localization is off). Forwarded so
     *  `.input` overrides on group/tabs containers can slice individually-
     *  localized subfield values (`{ [locale]: value }`) without reaching for a
     *  context. Threaded from the bridge via FieldTreeRenderer. */
    activeLocale?: string | null;
    /** v3.7: the FieldPermissions of THIS field itself. For array/blocks
     *  containers this is forwarded as `rowPerms`/`blockPerms` so per-row
     *  subfields can be gated. */
    fieldPerms?: unknown;
    /** Active i18n `t`, injected by `FieldInput` and forwarded to `.input`
     *  override components. Overrides that ship as a direct (Node-loaded)
     *  component reference cannot import `@payloadcms/ui` to call
     *  `useTranslation()` themselves (its barrel pulls CSS that crashes the
     *  Payload CLI's Node config load), so they read `t` from here instead. */
    t?: TFunction;
};
export declare const normalizeOptions: (options: FieldInputOption[] | undefined) => {
    value: string;
    label: string;
}[];
export declare function FieldInput(props: FieldInputProps): React.ReactElement;
/** Searchable single-select combobox (Popover + Command), for long option
 *  lists like a locale picker. Mirrors MultiSelect's chrome but holds one
 *  value and closes on pick. */
export declare function SearchableSelect({ id, options, value, onChange, invalid, disabled, }: {
    id: string;
    options: {
        value: string;
        label: string;
    }[];
    value: string;
    onChange: (next: string) => void;
    invalid?: boolean;
    disabled?: boolean;
}): React.ReactElement;

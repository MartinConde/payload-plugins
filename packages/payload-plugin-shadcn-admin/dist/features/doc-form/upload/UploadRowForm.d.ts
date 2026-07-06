import * as React from 'react';
import type { ExtractedCollection, ExtractedField } from 'payload-plugin-shadcn-ui';
export type UploadRowFormProps = {
    rowId: string;
    collectionSlug: string;
    collectionFields: ExtractedField[];
    values: Record<string, unknown>;
    errors: Record<string, string>;
    onValuesChange: (next: Record<string, unknown>) => void;
    onErrorClear: (path: string) => void;
    useAsTitleBySlug: Record<string, string | undefined>;
    uploadCollectionsBySlug: Record<string, ExtractedCollection>;
    activeLocale: string | null;
    localizationEnabled: boolean;
    disabled: boolean;
};
export declare function UploadRowForm({ rowId, collectionSlug, collectionFields, values, errors, onValuesChange, onErrorClear, useAsTitleBySlug, uploadCollectionsBySlug, activeLocale, localizationEnabled, disabled, }: UploadRowFormProps): React.ReactElement;

import * as React from 'react';
import type { ExtractedCollection } from 'payload-plugin-shadcn-ui';
export type UploadFieldInputProps = {
    id?: string;
    fieldName: string;
    relationTo: string | string[];
    hasMany?: boolean;
    useAsTitleBySlug: Record<string, string | undefined>;
    uploadCollectionsBySlug?: Record<string, ExtractedCollection>;
    value: unknown;
    onChange: (next: unknown) => void;
    disabled?: boolean;
    invalid?: boolean;
};
export declare function UploadFieldInput({ relationTo, hasMany, useAsTitleBySlug, uploadCollectionsBySlug, value, onChange, disabled, invalid, }: UploadFieldInputProps): React.ReactElement;

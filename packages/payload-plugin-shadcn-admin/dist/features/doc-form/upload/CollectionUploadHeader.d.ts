import * as React from 'react';
import type { UploadEdits } from '../../../internal/payloadAdapter.js';
import { type DropzoneExisting } from '../inputs/DropzoneInput.js';
import type { ExtractedCollection, ExtractedUploadConfig } from 'payload-plugin-shadcn-ui';
export type CollectionUploadHeaderProps = {
    mode: 'create' | 'edit';
    collectionSlug: string;
    uploadConfig: ExtractedUploadConfig;
    uploadCollectionsBySlug?: Record<string, ExtractedCollection>;
    useAsTitleBySlug?: Record<string, string | undefined>;
    existing?: DropzoneExisting | null;
    pendingFile: File | null;
    onPendingFileChange: (next: File | null) => void;
    uploadEdits: UploadEdits | null;
    onUploadEditsChange: (next: UploadEdits | null) => void;
    disabled?: boolean;
    invalid?: boolean;
};
export declare function CollectionUploadHeader({ mode, collectionSlug, uploadConfig, uploadCollectionsBySlug, useAsTitleBySlug, existing, pendingFile, onPendingFileChange, uploadEdits, onUploadEditsChange, disabled, invalid, }: CollectionUploadHeaderProps): React.ReactElement;

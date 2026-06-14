import * as React from 'react';
export type DropzoneExisting = {
    url: string;
    thumbnailURL?: string | null;
    filename?: string | null;
    mimeType?: string | null;
    filesize?: number | null;
    width?: number | null;
    height?: number | null;
};
export type DropzoneInputProps = {
    id?: string;
    value: File | null;
    onChange: (next: File | null) => void;
    existing?: DropzoneExisting | null;
    mimeTypes?: string[];
    /** Bytes. */
    maxFileSize?: number;
    /** Accept multiple files on the picker / drop. Multi-drop dispatches
     *  via `onMultiDrop` and does NOT set value. */
    multiple?: boolean;
    onMultiDrop?: (files: FileList) => void;
    cropEnabled?: boolean;
    focalPointEnabled?: boolean;
    /** Trigger the EditUpload modal in the parent (which owns the file/url
     *  the editor should operate on). */
    onEditOpen?: () => void;
    disabled?: boolean;
    invalid?: boolean;
};
export declare function DropzoneInput({ id, value, onChange, existing, mimeTypes, maxFileSize, multiple, onMultiDrop, cropEnabled, focalPointEnabled, onEditOpen, disabled, invalid, }: DropzoneInputProps): React.ReactElement;

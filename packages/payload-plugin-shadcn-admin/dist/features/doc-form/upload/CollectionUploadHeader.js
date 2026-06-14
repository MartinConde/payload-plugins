'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Header region rendered above the field list for upload-collection create
   and edit views (when `collection.upload` is set). Owns the dropzone, the
   <EditUpload/> crop/focal-point dialog (lifted directly from @payloadcms/ui
   — self-contained per pre-research, no provider deps), and the bulk-upload
   drawer wiring for multi-file drops on the create view.

   File / edits state is owned by the bridge and passed in via props; this
   component is the visible surface. */ import * as React from 'react';
import { useRouter } from 'next/navigation';
import { EditUpload } from '../../../internal/payloadAdapter.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'payload-plugin-shadcn-ui';
import { DropzoneInput } from '../inputs/DropzoneInput.js';
import { UploadNewDialog } from './UploadNewDialog.js';
export function CollectionUploadHeader({ mode, collectionSlug, uploadConfig, uploadCollectionsBySlug = {}, useAsTitleBySlug = {}, existing, pendingFile, onPendingFileChange, uploadEdits, onUploadEditsChange, disabled, invalid }) {
    const router = useRouter();
    const [editOpen, setEditOpen] = React.useState(false);
    // Multi-file drops open the custom UploadNewDialog seeded with the dropped
    // files (replacing Payload's native BulkUploadDrawer).
    const [bulkOpen, setBulkOpen] = React.useState(false);
    const [bulkFiles, setBulkFiles] = React.useState([]);
    // Build the EditUpload payload from either the pending file (objectURL +
    // file.name) or the existing saved doc (url + filename). EditUpload reads
    // the image from `fileSrc` directly, so an object URL works the same as
    // a remote URL. Tracked in state (not a ref-in-memo) so React's
    // effect-cleanup contract reliably revokes the URL — important under
    // StrictMode where render-phase side effects fire twice.
    const [editInputs, setEditInputs] = React.useState(null);
    React.useEffect(()=>{
        if (pendingFile) {
            const url = URL.createObjectURL(pendingFile);
            setEditInputs({
                fileName: pendingFile.name,
                fileSrc: url
            });
            return ()=>URL.revokeObjectURL(url);
        }
        if (existing?.url) {
            setEditInputs({
                fileName: existing.filename ?? 'file',
                fileSrc: existing.url
            });
            return undefined;
        }
        setEditInputs(null);
        return undefined;
    }, [
        pendingFile,
        existing?.url,
        existing?.filename
    ]);
    const handleMultiDrop = React.useCallback((files)=>{
        setBulkFiles(Array.from(files));
        setBulkOpen(true);
    }, []);
    const editEnabled = Boolean(uploadConfig.crop || uploadConfig.focalPoint);
    return /*#__PURE__*/ _jsxs("section", {
        className: "flex flex-col gap-2 rounded-md border bg-card p-3",
        children: [
            /*#__PURE__*/ _jsx("h2", {
                className: "text-sm font-medium",
                children: "File"
            }),
            /*#__PURE__*/ _jsx(DropzoneInput, {
                value: pendingFile,
                onChange: (f)=>{
                    onPendingFileChange(f);
                    // Picking a new file invalidates prior crop/focal edits.
                    if (uploadEdits) onUploadEditsChange(null);
                },
                existing: existing,
                mimeTypes: uploadConfig.mimeTypes,
                maxFileSize: uploadConfig.maxFileSize,
                multiple: mode === 'create',
                onMultiDrop: mode === 'create' ? handleMultiDrop : undefined,
                cropEnabled: uploadConfig.crop,
                focalPointEnabled: uploadConfig.focalPoint,
                onEditOpen: editEnabled ? ()=>setEditOpen(true) : undefined,
                disabled: disabled,
                invalid: invalid
            }),
            editEnabled && editInputs ? /*#__PURE__*/ _jsx(Dialog, {
                open: editOpen,
                onOpenChange: setEditOpen,
                children: /*#__PURE__*/ _jsxs(DialogContent, {
                    className: "max-w-3xl",
                    children: [
                        /*#__PURE__*/ _jsx(DialogHeader, {
                            children: /*#__PURE__*/ _jsx(DialogTitle, {
                                children: "Edit upload"
                            })
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "max-h-[70vh] overflow-auto",
                            children: /*#__PURE__*/ _jsx(EditUpload, {
                                fileName: editInputs.fileName,
                                fileSrc: editInputs.fileSrc,
                                initialCrop: uploadEdits?.crop ?? existing?.crop,
                                initialFocalPoint: uploadEdits?.focalPoint ?? existing?.focalPoint,
                                showCrop: Boolean(uploadConfig.crop),
                                showFocalPoint: Boolean(uploadConfig.focalPoint),
                                onSave: (edits)=>{
                                    onUploadEditsChange(edits);
                                    setEditOpen(false);
                                }
                            })
                        })
                    ]
                })
            }) : null,
            /*#__PURE__*/ _jsx(UploadNewDialog, {
                open: bulkOpen,
                onOpenChange: setBulkOpen,
                collectionSlug: collectionSlug,
                uploadCollectionsBySlug: uploadCollectionsBySlug,
                useAsTitleBySlug: useAsTitleBySlug,
                maxFiles: 0,
                initialFiles: bulkFiles,
                onSuccess: ()=>{
                    // After the dialog creates docs, navigate to the collection list so
                    // users see what landed.
                    router.push(`/admin/collections/${collectionSlug}`);
                }
            })
        ]
    });
}

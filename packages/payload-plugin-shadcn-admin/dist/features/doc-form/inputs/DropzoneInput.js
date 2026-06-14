'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Self-contained shadcn dropzone for upload-collection files and
   upload-field "upload new" flows. Renders a click-to-pick input plus
   drag-and-drop affordance, validates against the collection's mimeTypes
   and maxFileSize client-side, and shows one of three preview states:
   newly-picked file (createObjectURL), existing saved doc (url/thumbnailURL),
   or empty prompt.

   Multi-file drop dispatches via `onMultiDrop` instead of setting `value` —
   the collection-level header opens the bulk-upload drawer in that path.

   Crop / focal-point editing is delegated upward via `onEditOpen` so the
   caller can mount Payload's <EditUpload/> inside whatever modal primitive
   it prefers. */ import * as React from 'react';
import { FileIcon, ImageIcon, PencilIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
const formatBytes = (n)=>{
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
};
const isImageMime = (mt)=>Boolean(mt && mt.startsWith('image/'));
/* mimeTypes can include wildcards (`image/*`) and extension shorthands
   (`.pdf`). Mirror what Payload uses for the picker `accept` attribute. */ const matchesMime = (file, mimeTypes)=>{
    if (!mimeTypes || mimeTypes.length === 0) return true;
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    for (const allowed of mimeTypes){
        if (allowed.startsWith('.')) {
            if (fileName.endsWith(allowed.toLowerCase())) return true;
            continue;
        }
        if (allowed.endsWith('/*')) {
            const prefix = allowed.slice(0, -1);
            if (fileType.startsWith(prefix)) return true;
            continue;
        }
        if (fileType === allowed) return true;
    }
    return false;
};
export function DropzoneInput({ id, value, onChange, existing, mimeTypes, maxFileSize, multiple, onMultiDrop, cropEnabled, focalPointEnabled, onEditOpen, disabled, invalid }) {
    const { t } = useTranslation();
    const [dragOver, setDragOver] = React.useState(false);
    const [error, setError] = React.useState(null);
    const inputRef = React.useRef(null);
    // Object URL for the newly-picked file preview; revoked when value changes
    // or component unmounts.
    const [objectUrl, setObjectUrl] = React.useState(null);
    React.useEffect(()=>{
        if (value && isImageMime(value.type)) {
            const url = URL.createObjectURL(value);
            setObjectUrl(url);
            return ()=>URL.revokeObjectURL(url);
        }
        setObjectUrl(null);
        return undefined;
    }, [
        value
    ]);
    const validate = (file)=>{
        if (!matchesMime(file, mimeTypes)) {
            return `File type "${file.type || file.name}" not allowed${mimeTypes && mimeTypes.length > 0 ? ` (accepted: ${mimeTypes.join(', ')})` : ''}.`;
        }
        if (typeof maxFileSize === 'number' && file.size > maxFileSize) {
            return `File too large (${formatBytes(file.size)} > ${formatBytes(maxFileSize)}).`;
        }
        return null;
    };
    const acceptFiles = (files)=>{
        if (!files || files.length === 0) return;
        if (multiple && files.length > 1 && onMultiDrop) {
            onMultiDrop(files);
            setError(null);
            return;
        }
        const file = files[0];
        const err = validate(file);
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        onChange(file);
    };
    const onDrop = (e)=>{
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        acceptFiles(e.dataTransfer?.files ?? null);
    };
    const acceptAttr = (mimeTypes ?? []).join(',') || undefined;
    const showExisting = !value && existing && existing.url;
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-2",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: cn('relative flex flex-col items-stretch overflow-hidden rounded-md border border-dashed bg-muted/20 transition-colors', dragOver ? 'border-ring bg-muted/40' : 'border-input', (error || invalid) && 'border-destructive', disabled && 'opacity-50'),
                onDragOver: (e)=>{
                    e.preventDefault();
                    if (disabled) return;
                    setDragOver(true);
                },
                onDragLeave: ()=>setDragOver(false),
                onDrop: onDrop,
                children: [
                    /*#__PURE__*/ _jsx("input", {
                        ref: inputRef,
                        id: id,
                        type: "file",
                        accept: acceptAttr,
                        multiple: multiple,
                        disabled: disabled,
                        className: "hidden",
                        onChange: (e)=>acceptFiles(e.target.files)
                    }),
                    value ? /*#__PURE__*/ _jsx(FilePreview, {
                        file: value,
                        objectUrl: objectUrl,
                        onClear: ()=>{
                            onChange(null);
                            setError(null);
                            if (inputRef.current) inputRef.current.value = '';
                        },
                        onReplace: ()=>inputRef.current?.click(),
                        onEdit: onEditOpen && (cropEnabled || focalPointEnabled) && isImageMime(value.type) ? onEditOpen : undefined,
                        disabled: disabled
                    }) : showExisting ? /*#__PURE__*/ _jsx(ExistingPreview, {
                        existing: existing,
                        onReplace: ()=>inputRef.current?.click(),
                        onClear: ()=>{
                            // Clearing the EXISTING file isn't supported in v3.5 (would
                            // require sending a sentinel to the server; instead the user
                            // can delete the doc). Just kick the picker open.
                            inputRef.current?.click();
                        },
                        onEdit: onEditOpen && (cropEnabled || focalPointEnabled) && isImageMime(existing.mimeType) ? onEditOpen : undefined,
                        disabled: disabled
                    }) : /*#__PURE__*/ _jsxs("button", {
                        type: "button",
                        disabled: disabled,
                        onClick: ()=>inputRef.current?.click(),
                        className: "flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground hover:text-foreground",
                        children: [
                            /*#__PURE__*/ _jsx(ImageIcon, {
                                className: "size-8"
                            }),
                            /*#__PURE__*/ _jsxs("span", {
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "font-medium text-foreground",
                                        children: t('shadcnAdmin:clickToPick')
                                    }),
                                    ' ',
                                    t('shadcnAdmin:orDragFileHere')
                                ]
                            }),
                            mimeTypes && mimeTypes.length > 0 ? /*#__PURE__*/ _jsx("span", {
                                className: "text-xs",
                                children: mimeTypes.join(', ')
                            }) : null,
                            typeof maxFileSize === 'number' ? /*#__PURE__*/ _jsx("span", {
                                className: "text-xs",
                                children: t('shadcnAdmin:dropzoneMax', {
                                    size: formatBytes(maxFileSize)
                                })
                            }) : null
                        ]
                    })
                ]
            }),
            error ? /*#__PURE__*/ _jsx("p", {
                className: "text-xs text-destructive",
                children: error
            }) : null
        ]
    });
}
function FilePreview({ file, objectUrl, onClear, onReplace, onEdit, disabled }) {
    const isImg = isImageMime(file.type) && objectUrl;
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-4 p-3",
        children: [
            /*#__PURE__*/ _jsx("div", {
                className: "flex size-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-background",
                children: isImg ? // eslint-disable-next-line @next/next/no-img-element
                /*#__PURE__*/ _jsx("img", {
                    src: objectUrl,
                    alt: file.name,
                    className: "size-full object-contain"
                }) : /*#__PURE__*/ _jsx(FileIcon, {
                    className: "size-8 text-muted-foreground"
                })
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "min-w-0 flex-1",
                children: [
                    /*#__PURE__*/ _jsx("p", {
                        className: "truncate text-sm font-medium",
                        children: file.name
                    }),
                    /*#__PURE__*/ _jsxs("p", {
                        className: "text-xs text-muted-foreground",
                        children: [
                            file.type || 'unknown',
                            " · ",
                            formatBytes(file.size)
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex shrink-0 items-center gap-1",
                children: [
                    onEdit ? /*#__PURE__*/ _jsxs(Button, {
                        type: "button",
                        size: "sm",
                        variant: "ghost",
                        disabled: disabled,
                        onClick: onEdit,
                        children: [
                            /*#__PURE__*/ _jsx(PencilIcon, {
                                className: "size-3.5"
                            }),
                            /*#__PURE__*/ _jsx("span", {
                                className: "ml-1",
                                children: "Edit"
                            })
                        ]
                    }) : null,
                    /*#__PURE__*/ _jsxs(Button, {
                        type: "button",
                        size: "sm",
                        variant: "ghost",
                        disabled: disabled,
                        onClick: onReplace,
                        children: [
                            /*#__PURE__*/ _jsx(RefreshCwIcon, {
                                className: "size-3.5"
                            }),
                            /*#__PURE__*/ _jsx("span", {
                                className: "ml-1",
                                children: "Replace"
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsx(Button, {
                        type: "button",
                        size: "sm",
                        variant: "ghost",
                        disabled: disabled,
                        onClick: onClear,
                        children: /*#__PURE__*/ _jsx(XIcon, {
                            className: "size-3.5"
                        })
                    })
                ]
            })
        ]
    });
}
function ExistingPreview({ existing, onReplace, onClear: _onClear, onEdit, disabled }) {
    const isImg = isImageMime(existing.mimeType);
    const src = existing.thumbnailURL ?? existing.url;
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-4 p-3",
        children: [
            /*#__PURE__*/ _jsx("div", {
                className: "flex size-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-background",
                children: isImg ? // eslint-disable-next-line @next/next/no-img-element
                /*#__PURE__*/ _jsx("img", {
                    src: src,
                    alt: existing.filename ?? '',
                    className: "size-full object-contain"
                }) : /*#__PURE__*/ _jsx(FileIcon, {
                    className: "size-8 text-muted-foreground"
                })
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "min-w-0 flex-1",
                children: [
                    /*#__PURE__*/ _jsx("p", {
                        className: "truncate text-sm font-medium",
                        children: existing.filename ?? existing.url
                    }),
                    /*#__PURE__*/ _jsxs("p", {
                        className: "text-xs text-muted-foreground",
                        children: [
                            existing.mimeType ?? 'unknown',
                            typeof existing.filesize === 'number' ? ` · ${formatBytes(existing.filesize)}` : '',
                            existing.width && existing.height ? ` · ${existing.width}×${existing.height}` : ''
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex shrink-0 items-center gap-1",
                children: [
                    onEdit ? /*#__PURE__*/ _jsxs(Button, {
                        type: "button",
                        size: "sm",
                        variant: "ghost",
                        disabled: disabled,
                        onClick: onEdit,
                        children: [
                            /*#__PURE__*/ _jsx(PencilIcon, {
                                className: "size-3.5"
                            }),
                            /*#__PURE__*/ _jsx("span", {
                                className: "ml-1",
                                children: "Edit"
                            })
                        ]
                    }) : null,
                    /*#__PURE__*/ _jsxs(Button, {
                        type: "button",
                        size: "sm",
                        variant: "ghost",
                        disabled: disabled,
                        onClick: onReplace,
                        children: [
                            /*#__PURE__*/ _jsx(RefreshCwIcon, {
                                className: "size-3.5"
                            }),
                            /*#__PURE__*/ _jsx("span", {
                                className: "ml-1",
                                children: "Replace"
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

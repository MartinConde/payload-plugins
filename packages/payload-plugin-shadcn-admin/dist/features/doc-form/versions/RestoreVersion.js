'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Restore controls for the version diff view. POSTs to Payload's restoreVersion
   endpoint — `/api/{slug}/versions/{versionId}` for collections,
   `/api/globals/{slug}/versions/{versionId}` for globals; `?draft=true` restores
   as a draft instead of publishing. On success, returns the user to the doc edit
   view. Lifts the restore logic out of the old VersionsDialog. v3.9. */ import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LoaderIcon, RotateCcwIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
export function RestoreVersion({ collectionSlug, globalSlug, versionId, basePath, draftsEnabled }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [pending, setPending] = React.useState(null);
    const [error, setError] = React.useState(null);
    const restoreBase = globalSlug ? `/api/globals/${globalSlug}/versions/${versionId}` : `/api/${collectionSlug}/versions/${versionId}`;
    const restore = async (asDraft)=>{
        setPending(asDraft ? 'draft' : 'publish');
        setError(null);
        try {
            const qs = asDraft ? '?draft=true' : '';
            const res = await fetch(`${restoreBase}${qs}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                setError(t('version:problemRestoringVersion'));
                return;
            }
            router.push(basePath);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('version:problemRestoringVersion'));
        } finally{
            setPending(null);
        }
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-2",
        children: [
            error ? /*#__PURE__*/ _jsx("span", {
                className: "text-sm text-destructive",
                children: error
            }) : null,
            draftsEnabled ? /*#__PURE__*/ _jsxs(Button, {
                type: "button",
                variant: "outline",
                size: "sm",
                disabled: pending !== null,
                onClick: ()=>void restore(true),
                children: [
                    pending === 'draft' ? /*#__PURE__*/ _jsx(LoaderIcon, {
                        className: "size-3.5 animate-spin"
                    }) : /*#__PURE__*/ _jsx(RotateCcwIcon, {
                        className: "size-3.5"
                    }),
                    /*#__PURE__*/ _jsx("span", {
                        className: "ml-1",
                        children: t('version:restoreAsDraft')
                    })
                ]
            }) : null,
            /*#__PURE__*/ _jsxs(Button, {
                type: "button",
                size: "sm",
                disabled: pending !== null,
                onClick: ()=>void restore(false),
                children: [
                    pending === 'publish' ? /*#__PURE__*/ _jsx(LoaderIcon, {
                        className: "size-3.5 animate-spin"
                    }) : /*#__PURE__*/ _jsx(RotateCcwIcon, {
                        className: "size-3.5"
                    }),
                    /*#__PURE__*/ _jsx("span", {
                        className: "ml-1",
                        children: t('version:restoreThisVersion')
                    })
                ]
            })
        ]
    });
}

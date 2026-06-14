'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* The heavy print-area editor, lazy-loaded by PrintAreaInput so its
   window-touching / CSS-pulling imports (fabric, @payloadcms/ui, shadcn
   primitives) never reach the Payload CLI's Node config load. Runs only in the
   browser.

   This file is intentionally tiny: it's pure layout. State, refs, the Fabric
   Canvas lifecycle, and the form-sync rules all live in `EditorContext`. Each
   pane (toolbar, canvas, sidebar tabs) reads what it needs via `useEditor()`. */ import * as React from 'react';
import { ImagePlusIcon } from 'lucide-react';
import { Card, CardContent } from 'payload-plugin-shadcn-ui';
import { normalizePrintAreasValue } from '../printArea.js';
import { EditorCanvas } from './EditorCanvas.js';
import { EditorProvider, useEditor } from './EditorContext.js';
import { EditorSidebar } from './EditorSidebar.js';
import { EditorToolbar } from './EditorToolbar.js';
/** Legacy single-mockup mount: bridges `FieldInputProps` into `EditorBindings`
 *  so the original `.input` override on a top-level `printAreas` JSON field
 *  keeps working. Phase 2's products collection no longer mounts this path —
 *  the Designer is the only surface — but the file stays compilable so
 *  consumers can opt back into the raw editor on any JSON field. */ export function PrintAreaEditor(props) {
    const bindings = React.useMemo(()=>{
        const fromCustom = props.field?.custom?.['plugin-shadcn-admin'];
        const mediaSlug = fromCustom?.mediaCollectionSlug || 'media';
        return {
            value: normalizePrintAreasValue(props.value),
            onChange: props.onChange,
            media: {
                slug: mediaSlug,
                fieldPath: 'mockup'
            },
            disabled: props.disabled,
            lockPerAreaMm: false
        };
    }, [
        props.field,
        props.value,
        props.onChange,
        props.disabled
    ]);
    return /*#__PURE__*/ _jsx(EditorProvider, {
        bindings: bindings,
        children: /*#__PURE__*/ _jsx(EditorShell, {})
    });
}
/* The shell is a separate component so it can call `useEditor()` (the provider
   has to wrap something before its context is available). */ function EditorShell() {
    const { loadState, tr } = useEditor();
    if (loadState === 'no-id') {
        return /*#__PURE__*/ _jsx(Card, {
            className: "border-dashed",
            children: /*#__PURE__*/ _jsxs(CardContent, {
                className: "flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground",
                children: [
                    /*#__PURE__*/ _jsx(ImagePlusIcon, {
                        className: "size-6"
                    }),
                    /*#__PURE__*/ _jsx("p", {
                        className: "text-sm",
                        children: tr('pluginProducts:uploadMockupFirst')
                    })
                ]
            })
        });
    }
    if (loadState === 'error') {
        return /*#__PURE__*/ _jsx(Card, {
            className: "border-destructive/40",
            children: /*#__PURE__*/ _jsx(CardContent, {
                className: "py-8 text-center text-sm text-destructive",
                children: tr('pluginProducts:imageError')
            })
        });
    }
    /* ~65/35 split at md+ (col-span-2 / col-span-1 on a 3-col grid = 67/33),
     stacked below the md breakpoint. Standard Tailwind utilities only — the
     arbitrary `grid-cols-[65fr_35fr]` form was being silently dropped by
     the consumer's JIT scan of the plugin's dist. Toolbar always above the
     canvas pane; sidebar hosts the tabbed settings. */ return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-3",
        children: [
            /*#__PURE__*/ _jsx(EditorToolbar, {}),
            /*#__PURE__*/ _jsxs("div", {
                className: "grid grid-cols-1 gap-4 md:grid-cols-3",
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        className: "md:col-span-2 min-w-0",
                        children: /*#__PURE__*/ _jsx(EditorCanvas, {})
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        className: "md:col-span-1 min-w-0",
                        children: /*#__PURE__*/ _jsx(EditorSidebar, {})
                    })
                ]
            })
        ]
    });
}
/** Public, host-provided variant: renders the editor against an already-built
 *  bindings object. The Designer uses this so it can drive value/onChange off
 *  the active view's split sub-fields (placement + transform) and the
 *  per-view mockup upload. */ export function PrintAreaEditorWithBindings({ bindings }) {
    return /*#__PURE__*/ _jsx(EditorProvider, {
        bindings: bindings,
        children: /*#__PURE__*/ _jsx(EditorShell, {})
    });
}
export { EditorShell };

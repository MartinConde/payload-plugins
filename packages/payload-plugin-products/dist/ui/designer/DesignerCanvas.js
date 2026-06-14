'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Heavy designer component, lazy-loaded by DesignerField. Owns the
   ACTIVE-VIEW-INDEX and ACTIVE-COLOR-INDEX local state and mounts the
   existing Fabric editor against the active (view, color) `colorMockups`
   row. Note the `key={`${activeView}-${activeColor}`}` on EditorProvider —
   so a tab or chip switch tears down the Fabric canvas and disposes any
   in-flight 150ms debounce, preventing pending writes from clobbering the
   new row's geometry. */ import * as React from 'react';
import { ImagePlusIcon, InfoIcon, LockIcon } from 'lucide-react';
import { Card, CardContent, useDocFormFieldValue } from 'payload-plugin-shadcn-ui';
import { useConfig, useTranslation } from '@payloadcms/ui';
import { EditorCanvas } from '../editor/EditorCanvas.js';
import { EditorProvider } from '../editor/EditorContext.js';
import { EditorSidebar } from '../editor/EditorSidebar.js';
import { EditorToolbar } from '../editor/EditorToolbar.js';
import { useEditor } from '../editor/EditorContext.js';
import { ColorChips } from './ColorChips.js';
import { DesignerActiveProvider } from './DesignerActiveContext.js';
import { NoColorsEmptyState } from './NoColorsEmptyState.js';
import { useEditorBindings } from './useEditorBindings.js';
import { ViewTabs } from './ViewTabs.js';
const DEFAULT_PRESETS = [
    'Front',
    'Back',
    'Left',
    'Right',
    'Sleeve'
];
const refToId = (raw)=>{
    if (raw == null) return null;
    if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
    if (typeof raw === 'object') {
        const id = raw.id;
        return id == null ? null : String(id);
    }
    return null;
};
export function DesignerCanvas(props) {
    const [activeView, setActiveView] = React.useState(0);
    const [activeColor, setActiveColor] = React.useState(0);
    const custom = props.field?.custom?.['plugin-shadcn-admin'];
    const mediaSlug = custom?.mediaCollectionSlug || 'media';
    const colorSwatchesSlug = custom?.colorSwatchesSlug || 'color-swatches';
    const printTemplatesSlug = custom?.printTemplatesSlug || 'print-templates';
    const presets = Array.isArray(custom?.defaultViewPresets) && custom.defaultViewPresets.length > 0 ? custom.defaultViewPresets : DEFAULT_PRESETS;
    const colorsRaw = useDocFormFieldValue('colors');
    const hasColors = React.useMemo(()=>{
        if (!Array.isArray(colorsRaw)) return false;
        return colorsRaw.some((c)=>refToId(c) !== null);
    }, [
        colorsRaw
    ]);
    const viewName = useDocFormFieldValue(`views.${activeView}.name`);
    const activeColorRef = useDocFormFieldValue(`views.${activeView}.colorMockups.${activeColor}.color`);
    const activeColorId = refToId(activeColorRef);
    const bindings = useEditorBindings(activeView, activeColor, mediaSlug, props.disabled);
    const activeCtx = React.useMemo(()=>({
            activeView,
            activeColor,
            setActiveView,
            setActiveColor,
            colorSwatchesSlug,
            printTemplatesSlug,
            mediaCollectionSlug: mediaSlug
        }), [
        activeView,
        activeColor,
        colorSwatchesSlug,
        printTemplatesSlug,
        mediaSlug
    ]);
    return /*#__PURE__*/ _jsx(DesignerActiveProvider, {
        value: activeCtx,
        children: /*#__PURE__*/ _jsxs("div", {
            className: "flex flex-col gap-3",
            children: [
                /*#__PURE__*/ _jsx(ViewTabs, {
                    active: activeView,
                    onActive: setActiveView,
                    presets: presets,
                    disabled: props.disabled
                }),
                hasColors ? /*#__PURE__*/ _jsx(ColorChips, {
                    activeColor: activeColor,
                    onActiveColor: setActiveColor,
                    viewIndex: activeView,
                    colorSwatchesSlug: colorSwatchesSlug,
                    disabled: props.disabled
                }) : null,
                !hasColors ? /*#__PURE__*/ _jsx(NoColorsEmptyState, {}) : bindings.hasViewDims ? /*#__PURE__*/ _jsx(EditorProvider, {
                    bindings: bindings,
                    children: /*#__PURE__*/ _jsx(EditorShell, {
                        placementLocked: bindings.placementLocked,
                        unlockedSiblingCount: bindings.unlockedSiblingCount,
                        viewName: viewName,
                        colorLabel: activeColorId ?? '',
                        colorSwatchesSlug: colorSwatchesSlug
                    })
                }, `${activeView}-${activeColor}`) : /*#__PURE__*/ _jsx(PickDimsEmptyState, {})
            ]
        })
    });
}
/* ~65/35 split mirroring PrintAreaEditor's layout. State-gated banners
   (no-id / error) come from EditorContext via useEditor(). */ function EditorShell({ placementLocked, unlockedSiblingCount, viewName, colorLabel, colorSwatchesSlug }) {
    const { loadState, tr } = useEditor();
    const resolvedColorName = useColorName(colorLabel, colorSwatchesSlug);
    if (loadState === 'no-id') {
        const text = tr('pluginProducts:uploadMockupTask').replace(/\{\{color\}\}/g, resolvedColorName || colorLabel || '').replace(/\{\{view\}\}/g, viewName ?? '');
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
                        children: text
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
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-3",
        children: [
            /*#__PURE__*/ _jsx(EditorToolbar, {}),
            /*#__PURE__*/ _jsx(BroadcastBanner, {
                locked: placementLocked,
                count: unlockedSiblingCount,
                viewName: viewName
            }),
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
function BroadcastBanner({ locked, count, viewName }) {
    const { tr } = useEditor();
    if (locked) {
        return /*#__PURE__*/ _jsxs("div", {
            className: "flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
            children: [
                /*#__PURE__*/ _jsx(LockIcon, {
                    className: "size-3.5"
                }),
                tr('pluginProducts:broadcastBannerLocked')
            ]
        });
    }
    const text = tr('pluginProducts:broadcastBannerUnlocked').replace(/\{\{count\}\}/g, String(count)).replace(/\{\{view\}\}/g, viewName ?? '');
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
        children: [
            /*#__PURE__*/ _jsx(InfoIcon, {
                className: "size-3.5"
            }),
            text
        ]
    });
}
/* Tiny on-demand fetch for the active color's display name. Keeps the
   empty-state copy specific without lifting the whole chip-strip docsById
   map up to DesignerCanvas. depth=0 + a single id keeps the response small. */ function useColorName(colorId, colorSwatchesSlug) {
    const { config } = useConfig();
    const apiBase = React.useMemo(()=>{
        const server = config?.serverURL || '';
        const api = config?.routes?.api || '/api';
        return `${server}${api}`;
    }, [
        config
    ]);
    const [name, setName] = React.useState('');
    React.useEffect(()=>{
        setName('');
        if (!colorId) return;
        let cancelled = false;
        void (async ()=>{
            try {
                const res = await fetch(`${apiBase}/${colorSwatchesSlug}/${colorId}?depth=0`, {
                    credentials: 'include'
                });
                if (!res.ok || cancelled) return;
                const doc = await res.json();
                if (cancelled) return;
                if (typeof doc.name === 'string') setName(doc.name);
            } catch  {
            // Soft fail — caller substitutes the id as fallback.
            }
        })();
        return ()=>{
            cancelled = true;
        };
    }, [
        colorId,
        apiBase,
        colorSwatchesSlug
    ]);
    return name;
}
function PickDimsEmptyState() {
    const { t } = useTranslation();
    const tr = (k)=>t(k);
    return /*#__PURE__*/ _jsx(Card, {
        className: "border-dashed",
        children: /*#__PURE__*/ _jsx(CardContent, {
            className: "py-12 text-center text-sm text-muted-foreground",
            children: tr('pluginProducts:pickTemplateOrCustom')
        })
    });
}

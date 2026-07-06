'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* "Sync from another language" panel shown above the tree editor. Reads the
   saved tree of another locale via the REST API and offers three merge
   modes (relabel from linked docs, copy labels as-is, keep current labels).
   Split out of MenuTreeEditor.tsx, which owns the tree state this writes back
   into via `onApply`. */ import * as React from 'react';
import { LanguagesIcon } from 'lucide-react';
import { useConfig } from '@payloadcms/ui';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useDocIdentity } from 'payload-plugin-shadcn-ui';
import { normalizeMenuTree } from '../menuTree.js';
import { mergeKeepingLabels, relabelFromDocs } from './menuTreeMutations.js';
export function LocaleSync({ activeLocale, tree, disabled, useAsTitleBySlug, tr, onApply }) {
    const { config } = useConfig();
    const { collectionSlug, documentId } = useDocIdentity();
    const locales = React.useMemo(()=>{
        const loc = config?.localization;
        if (!loc || typeof loc !== 'object') return [];
        const list = loc.locales;
        if (!Array.isArray(list)) return [];
        return list.map((l)=>({
                code: l.code,
                label: typeof l.label === 'string' ? l.label : l.code
            }));
    }, [
        config
    ]);
    const sources = locales.filter((l)=>l.code !== activeLocale);
    const [source, setSource] = React.useState('');
    // 'relabel' (default): re-derive document labels from the linked doc's title
    // in the current language. 'labels': copy source labels as-is. 'structure':
    // keep current labels where item ids match.
    const [mode, setMode] = React.useState('relabel');
    const [status, setStatus] = React.useState('idle');
    if (sources.length === 0) return null;
    const canSync = !disabled && documentId != null && collectionSlug != null && source !== '';
    const apply = async ()=>{
        if (!canSync) return;
        setStatus('loading');
        try {
            const res = await fetch(`/api/${collectionSlug}/${documentId}?locale=${source}&depth=0&draft=true`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error(String(res.status));
            const body = await res.json();
            const sourceTree = normalizeMenuTree(body.tree);
            // Never silently wipe the current language: the source read is of SAVED
            // data, so an unsaved/empty source would otherwise blow away the current
            // tree. Bail with a clear hint instead.
            if (sourceTree.length === 0) {
                setStatus('empty');
                return;
            }
            // Replacing existing items is destructive — confirm first.
            if (tree.length > 0 && !window.confirm(tr('pluginMenus:syncConfirmOverwrite', 'Replace the current language’s items with the copied structure?'))) {
                setStatus('idle');
                return;
            }
            const next = mode === 'labels' ? sourceTree : mode === 'structure' ? mergeKeepingLabels(sourceTree, tree) : await relabelFromDocs(sourceTree, activeLocale, useAsTitleBySlug);
            onApply(next);
            setStatus('done');
        } catch  {
            setStatus('error');
        }
    };
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                children: [
                    /*#__PURE__*/ _jsx(LanguagesIcon, {
                        className: "size-3.5"
                    }),
                    tr('pluginMenus:syncTitle', 'Sync from another language')
                ]
            }),
            /*#__PURE__*/ _jsx("p", {
                className: "text-xs text-muted-foreground",
                children: tr('pluginMenus:syncHint', 'Copies the saved structure of another language — save your changes first.')
            }),
            documentId == null ? /*#__PURE__*/ _jsx("p", {
                className: "text-xs text-muted-foreground",
                children: tr('pluginMenus:syncSaveFirst', 'Save the menu once before syncing languages.')
            }) : /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-wrap items-center gap-2",
                children: [
                    /*#__PURE__*/ _jsxs(Select, {
                        value: source,
                        onValueChange: setSource,
                        disabled: disabled,
                        children: [
                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                className: "h-8 w-[12rem]",
                                children: /*#__PURE__*/ _jsx(SelectValue, {
                                    placeholder: tr('pluginMenus:syncSourceLabel', 'Source language')
                                })
                            }),
                            /*#__PURE__*/ _jsx(SelectContent, {
                                children: sources.map((l)=>/*#__PURE__*/ _jsx(SelectItem, {
                                        value: l.code,
                                        children: l.label
                                    }, l.code))
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs(Select, {
                        value: mode,
                        onValueChange: (v)=>setMode(v),
                        disabled: disabled,
                        children: [
                            /*#__PURE__*/ _jsx(SelectTrigger, {
                                className: "h-8 w-[22rem]",
                                children: /*#__PURE__*/ _jsx(SelectValue, {})
                            }),
                            /*#__PURE__*/ _jsxs(SelectContent, {
                                children: [
                                    /*#__PURE__*/ _jsx(SelectItem, {
                                        value: "relabel",
                                        children: tr('pluginMenus:syncCopyRelabel', 'Labels from linked documents (this language)')
                                    }),
                                    /*#__PURE__*/ _jsx(SelectItem, {
                                        value: "labels",
                                        children: tr('pluginMenus:syncCopyWithLabels', 'Structure and labels (copy as-is)')
                                    }),
                                    /*#__PURE__*/ _jsx(SelectItem, {
                                        value: "structure",
                                        children: tr('pluginMenus:syncCopyStructureOnly', 'Structure only (keep current labels)')
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsx(Button, {
                        type: "button",
                        size: "sm",
                        disabled: !canSync || status === 'loading',
                        onClick: apply,
                        children: status === 'loading' ? tr('pluginMenus:syncLoading', 'Loading…') : tr('pluginMenus:syncApply', 'Copy into current language')
                    }),
                    status === 'error' ? /*#__PURE__*/ _jsx("span", {
                        className: "text-xs text-destructive",
                        children: tr('pluginMenus:syncError', 'Could not load that language. Please try again.')
                    }) : null,
                    status === 'empty' ? /*#__PURE__*/ _jsx("span", {
                        className: "text-xs text-amber-600 dark:text-amber-400",
                        children: tr('pluginMenus:syncEmptySource', 'The source language has no saved items. Save your changes first, then sync.')
                    }) : null,
                    status === 'done' ? /*#__PURE__*/ _jsx("span", {
                        className: "text-xs text-emerald-600 dark:text-emerald-400",
                        children: tr('pluginMenus:syncDone', 'Copied')
                    }) : null
                ]
            })
        ]
    });
}

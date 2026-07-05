'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* Owns the doc form's content-area layout below the sticky toolbar: the
   Live Preview / page-builder resizable-panel tree (main fields | preview |
   block settings, plus the layers column and block-picker sheet) when the
   collection has Live Preview wired up, and the plain two-column
   fields-beside-sidebar layout when it doesn't. Extracted verbatim out of
   AutoDocFormBridge (see REVIEW-FINDINGS.md 3.2) — no behavior change.

   `livePreviewOpen`/`builderModeOpen` are owned by the bridge (read there
   too, for the main form's `skipField` gate and its `hidden` class) and
   passed in as props; `selectedBlockId` is likewise owned by the bridge
   because `PageBuilderProvider` wraps the whole form, not just this
   subtree. Everything else page-builder-specific (panel refs/animation,
   the block-action handlers, the add-block-picker state) lives here. */ import * as React from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { cn } from 'payload-plugin-shadcn-ui';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from 'payload-plugin-shadcn-ui';
import { useTranslation } from '../../../internal/payloadAdapterUI.js';
import { getByPath, projectLocaleAtLeaves } from '../fieldTree/sharedHelpers.js';
import { subPerms } from '../access-control/fieldPermissions.js';
import { newRow, ensureRowId } from '../inputs/BlocksInput.js';
import { BlockPickerSheet } from '../inputs/BlockPickerSheet.js';
import { LivePreviewPanel } from './LivePreviewPanel.js';
import { BlockSettingsPanel } from './BlockSettingsPanel.js';
import { LayersPanel } from './LayersPanel.js';
export function PageBuilderLayout({ livePreviewEnabled, pageBuilderAvailable, layoutField, blocksFieldName, livePreviewOpen, setLivePreviewOpen, builderModeOpen, isMobile, values, setValueAtPath, activeLocale, localizationEnabled, collection, fallbackLocale, docPermissions, submitting, renderChild, mainFieldsContent, hasSidebar, sidebarTop, selectedBlockId, setSelectedBlockId }) {
    const { t } = useTranslation();
    // Locale-aware base path for the blocks field's rows — mirrors how
    // `makeFieldTreeRenderer`'s `renderField` computes `childBasePath` for a
    // localized array/blocks field. Kept in sync with that logic so this stays
    // correct if the field is ever localized.
    const layoutBasePath = layoutField?.localized && localizationEnabled && activeLocale ? `${layoutField.name}.${activeLocale}` : layoutField?.name ?? blocksFieldName;
    // Normalized mirror of `values` at `layoutBasePath` — same shape/defaulting
    // `BlocksInput` uses internally, kept independent here since the settings
    // panel and the block-action handlers below both need to read/index it
    // without going through that component.
    const layoutRows = React.useMemo(()=>{
        if (!pageBuilderAvailable) return [];
        const raw = getByPath(values, layoutBasePath);
        if (!Array.isArray(raw)) return [];
        return raw.map((r)=>r && typeof r === 'object' ? ensureRowId(r) : ensureRowId({}));
    }, [
        pageBuilderAvailable,
        values,
        layoutBasePath
    ]);
    const layoutFieldPerms = React.useMemo(()=>layoutField ? subPerms(docPermissions, layoutField.name) : undefined, [
        layoutField,
        docPermissions
    ]);
    // Live Preview Pass 2 (server-merge protocol, see LIVE-PREVIEW.md) — the
    // doc projected to the active locale, fed to `LivePreviewPanel`'s merge
    // sender. Reuses the SAME `projectLocaleAtLeaves` helper `submit()` already
    // applies before PATCHing, so the preview receives exactly the flat,
    // single-locale shape `getDraftDoc`/`BlocksRenderer` already consume — not
    // the raw `{en:…, fr:…}`-keyed `values` this form holds internally.
    const previewData = React.useMemo(()=>livePreviewEnabled ? projectLocaleAtLeaves(values, collection.fields, activeLocale ?? fallbackLocale ?? 'en') : null, [
        livePreviewEnabled,
        values,
        collection.fields,
        activeLocale,
        fallbackLocale
    ]);
    // Below `md`, panels stack — dragging a resize handle on a touchscreen-width
    // form isn't useful, and react-resizable-panels' `orientation` prop is the
    // one thing here that genuinely needs a runtime check rather than a
    // Tailwind breakpoint (it drives the library's own layout math, not just
    // CSS).
    const previewPanelRef = React.useRef(null);
    // The outer group's OTHER panel (main form fields). Only needed so builder
    // mode can collapse it to `0%` explicitly — plain `resize('100%')` on
    // `previewPanelRef` would be clamped by main's own `minSize="30%"`, since
    // that's a drag limit, not something an imperative `resize()` call
    // overrides. `collapse()` is the one call that bypasses `minSize` and jumps
    // straight to `collapsedSize` — the same reason `previewPanelRef` itself
    // uses `.collapse()` above rather than `.resize('0%')`.
    const mainPanelRef = React.useRef(null);
    // Animate only our own programmatic resize()/collapse() below, never a
    // user's drag (which must track the pointer 1:1) — flipped on right before
    // the imperative call and back off once the transition's had time to run.
    const [previewAnimating, setPreviewAnimating] = React.useState(false);
    React.useEffect(()=>{
        const previewPanel = previewPanelRef.current;
        const mainPanel = mainPanelRef.current;
        if (!previewPanel || !mainPanel) return;
        setPreviewAnimating(true);
        // Bare numbers are pixels to this library (only unit-suffixed strings —
        // or unitless strings, which it treats as "%" — are percentages), so
        // `50` here would resize to 50px, not 50%.
        //
        // Both panels are driven EXPLICITLY in every branch below — this isn't
        // redundant. The original 2-state version of this effect only ever
        // touched `previewPanel`, relying on `resize()`/`collapse()` trading
        // space with its ONE sibling to bring `mainPanel` along for free — true
        // as long as `mainPanel` was NEVER itself explicitly collapsed. Now that
        // builder mode DOES explicitly `mainPanel.collapse()` it, a transition
        // straight from builder mode to fully-closed (or back to preview-only)
        // skips the 50/50 middle state entirely, and the panel that was never
        // told to move again (implicitly relying on "the trade already handled
        // it") was left stuck at its stale 0%/collapsed size — a razor-thin
        // sliver, not the intended layout. Always setting both explicitly (the
        // shrinking side via `collapse()`, which is the one call that bypasses
        // `minSize` and can reach a true 0%, followed by the growing side's
        // `resize()` to its exact target) makes every transition correct
        // regardless of which two states it's moving between.
        if (!livePreviewOpen) {
            previewPanel.collapse();
            mainPanel.resize('100%');
        } else if (builderModeOpen) {
            // Builder mode: main collapses to 0%, preview takes the full 100% —
            // the "takes over the entire content area" layout the page-builder
            // needs (see LIVE-PREVIEW.md).
            mainPanel.collapse();
            previewPanel.resize('100%');
        } else {
            // Preview-only: the original 50/50 split.
            mainPanel.resize('50%');
            previewPanel.resize('50%');
        }
        const timeout = setTimeout(()=>setPreviewAnimating(false), 300);
        return ()=>clearTimeout(timeout);
    }, [
        livePreviewOpen,
        builderModeOpen
    ]);
    // Settings-panel `ResizablePanel`, same resize()/collapse()-on-effect
    // pattern as `previewPanelRef` above — expands when a block is selected
    // AND the preview is actually open, collapses otherwise.
    //
    // Lives in a NESTED `ResizablePanelGroup` (preview | settings) INSIDE the
    // outer preview panel, rather than as a 3rd sibling of the outer group's
    // (main | preview) pair — this is load-bearing, not a style choice.
    // `react-resizable-panels`' imperative `panel.resize()` only ever trades
    // space with that panel's ONE adjacent sibling (its internal pivot is
    // `[index, index+1]`, i.e. exactly the two panels either side of a single
    // drag handle) — it does not redistribute across the whole group. With 3
    // flat siblings [main, preview, settings], calling `preview.resize('50%')`
    // tried to take the space from its NEW neighbor `settings` (index+1)
    // instead of `main` — and since `settings` starts collapsed at 0% with
    // nothing to give, the resize was silently rejected and preview stayed at
    // 0%, which fed back through its `onResize` handler as `asPercentage: 0`
    // and immediately re-closed `livePreviewOpen` — a fixed-point that made
    // the toggle button look inert. Confirmed by reading the installed
    // `react-resizable-panels` source directly (`resize()`'s `pivotIndices`
    // computation), not guessed from docs. Nesting keeps every group at
    // exactly 2 panels, so each resize call's adjacent-pair math is exactly
    // the same shape this file already had working for (main | preview) before
    // this feature existed.
    //
    // Gating on `builderModeOpen` too (not just a selected block) matters: with
    // the panel group's required `overflow: visible` (sticky positioning), any
    // panel collapsed to `0%` must have NOTHING rendered inside it, or that
    // content visibly bleeds out past its own zero-width box instead of being
    // clipped — see BlockSettingsPanel's own doc comment on this. Only ever
    // touched when `pageBuilderAvailable`, so it's a no-op for every other
    // collection. Preview-only mode (`builderModeOpen` false) can never have a
    // `selectedBlockId` anyway — the iframe doesn't even install the click
    // overlay in that mode (see `pageBuilder` query param below) — but the
    // explicit check keeps this panel's collapsed state correct through the
    // brief window while `selectedBlockId` is being cleared on mode-exit.
    const blockSettingsPanelRef = React.useRef(null);
    const [blockSettingsAnimating, setBlockSettingsAnimating] = React.useState(false);
    React.useEffect(()=>{
        if (!pageBuilderAvailable) return;
        const panel = blockSettingsPanelRef.current;
        if (!panel) return;
        const shouldOpen = builderModeOpen && Boolean(selectedBlockId);
        // Skip a redundant call when already in the desired state — harmless
        // now that this panel's group is properly isolated (2 panels), but
        // still avoids pointless work/animation-flag churn on unrelated
        // re-renders (e.g. every keystroke touches `builderModeOpen`'s deps via
        // re-render, not just real open/close transitions).
        if (shouldOpen === !panel.isCollapsed()) return;
        setBlockSettingsAnimating(true);
        // Sized relative to the INNER group (preview | settings), which now
        // occupies the OUTER group's full ~100% in builder mode (not ~50%, as
        // when this ratio was first tuned for the 3-panel case) — 35% of that
        // full width keeps the settings column a similar absolute size to
        // before, without crowding out the embedded preview.
        if (shouldOpen) panel.resize('35%');
        else panel.collapse();
        const timeout = setTimeout(()=>setBlockSettingsAnimating(false), 300);
        return ()=>clearTimeout(timeout);
    }, [
        selectedBlockId,
        pageBuilderAvailable,
        builderModeOpen
    ]);
    // ── Page-builder block actions ──────────────────────────────────────────
    // Driven from the Live Preview iframe's floating toolbar via
    // LivePreviewPanel's `onBlockAction`. All route through the same
    // `setValueAtPath(layoutBasePath, nextArray)` every other field write goes
    // through — its structural array-diff (keyed on row `id`, in the bridge's
    // `setValueAtPath`) already handles richText rekey on reorder, so a plain
    // splice is enough; there's no separate "blocks mutation" API to call,
    // unlike payload-better-editor's dedicated MOVE_ROW/DUPLICATE_ROW/REMOVE_ROW
    // form-reducer actions (this bridge has no such reducer — every write is
    // just a value replacement).
    const [addBlockPickerOpen, setAddBlockPickerOpen] = React.useState(false);
    const [addAfterBlockId, setAddAfterBlockId] = React.useState(null);
    const moveBlock = (blockId, dir)=>{
        const idx = layoutRows.findIndex((r)=>r.id === blockId);
        if (idx < 0) return;
        const nextIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= layoutRows.length) return;
        setValueAtPath(layoutBasePath, arrayMove(layoutRows, idx, nextIdx));
    };
    const duplicateBlock = (blockId)=>{
        const idx = layoutRows.findIndex((r)=>r.id === blockId);
        if (idx < 0) return;
        const clone = {
            ...layoutRows[idx],
            id: globalThis.crypto?.randomUUID?.() ?? `block-${Math.random().toString(36).slice(2, 10)}`
        };
        const next = [
            ...layoutRows
        ];
        next.splice(idx + 1, 0, clone);
        setValueAtPath(layoutBasePath, next);
        setSelectedBlockId(clone.id);
    };
    const deleteBlock = (blockId)=>{
        setValueAtPath(layoutBasePath, layoutRows.filter((r)=>r.id !== blockId));
        setSelectedBlockId((current)=>current === blockId ? null : current);
    };
    const requestAddBlock = (afterBlockId)=>{
        setAddAfterBlockId(afterBlockId);
        setAddBlockPickerOpen(true);
    };
    // `BlockPickerSheet`'s `onSelect` — constructs the new row the same way
    // `BlocksInput`'s own "+ Add block" button does (`newRow`, exported for
    // exactly this reuse), so a page-builder-added block and a form-added
    // block are indistinguishable afterward.
    const handleBlockPicked = (slug)=>{
        const block = layoutField?.blocks?.find((b)=>b.slug === slug);
        if (!block) return;
        const row = newRow(block);
        const insertAt = addAfterBlockId == null ? 0 : (()=>{
            const idx = layoutRows.findIndex((r)=>r.id === addAfterBlockId);
            return idx < 0 ? layoutRows.length : idx + 1;
        })();
        const next = [
            ...layoutRows
        ];
        next.splice(insertAt, 0, row);
        setValueAtPath(layoutBasePath, next);
        // A brand-new row may render as nothing in the preview until its
        // required fields are filled in — auto-select regardless so the
        // settings panel opens right away rather than leaving the user unsure
        // anything happened.
        setSelectedBlockId(row.id);
    };
    const handlePageBuilderAction = (action)=>{
        if (action.action === 'move') moveBlock(action.blockId, action.dir);
        else if (action.action === 'duplicate') duplicateBlock(action.blockId);
        else if (action.action === 'delete') deleteBlock(action.blockId);
        else if (action.action === 'addRequest') requestAddBlock(action.afterBlockId);
    };
    return /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
            livePreviewEnabled ? // Always inside a ResizablePanelGroup once the collection has Live
            // Preview wired up — even while it's closed (collapsed to 0). That
            // way toggling it only ever resizes/collapses panels; it never swaps
            // out the surrounding tree (see the effect above driving
            // `previewPanelRef`), so the form fields never remount mid-edit.
            //
            // `overflow: visible` overrides react-resizable-panels' own default
            // (`hidden` on the group, `auto` on each panel) on both the group and
            // every panel below. That default assumes a fixed-height container
            // with each panel scrolling independently inside it; this form is a
            // normal long scrolling page instead, and the doc-sidebar's/preview's
            // `sticky` positioning (further down) only works against the page's
            // own scroll — any ancestor with non-`visible` overflow becomes its
            // own scroll container and breaks that.
            /*#__PURE__*/ _jsxs(ResizablePanelGroup, {
                orientation: isMobile ? 'vertical' : 'horizontal',
                className: "items-stretch gap-0",
                style: {
                    overflow: 'visible'
                },
                children: [
                    /*#__PURE__*/ _jsx(ResizablePanel, {
                        panelRef: mainPanelRef,
                        // `collapsible`/`collapsedSize="0%"` so builder mode can take
                        // this down to a true 0 via `.collapse()` — a plain `resize()`
                        // call would stop at `minSize` instead (see `mainPanelRef`'s doc
                        // comment above). `minSize` stays as the drag limit for the
                        // ordinary preview-only 2-panel case; builder mode never drags
                        // this, it only ever calls `.collapse()`/`.resize()`
                        // imperatively.
                        collapsible: true,
                        collapsedSize: "0%",
                        defaultSize: "100%",
                        minSize: "30%",
                        className: cn('min-w-0', previewAnimating && 'transition-[flex-basis] duration-300 ease-in-out'),
                        style: {
                            overflow: 'visible'
                        },
                        children: /*#__PURE__*/ _jsxs("div", {
                            className: cn('flex flex-col gap-6', hasSidebar && !livePreviewOpen && 'lg:flex-row', livePreviewOpen && 'lg:pr-6', builderModeOpen && 'hidden'),
                            children: [
                                /*#__PURE__*/ _jsx("div", {
                                    className: hasSidebar ? 'flex flex-1 min-w-0 flex-col gap-4' : 'contents',
                                    children: mainFieldsContent
                                }),
                                hasSidebar ? // Beside the main fields when the preview is closed (today's
                                // layout, unchanged); drops below them once the preview
                                // opens, so the main/preview split gets that width back.
                                /*#__PURE__*/ _jsxs("div", {
                                    className: cn('flex flex-col gap-4', livePreviewOpen ? 'border-t pt-4' : 'shrink-0 lg:sticky lg:top-16 lg:w-72 lg:border-l lg:pl-6'),
                                    children: [
                                        livePreviewOpen ? /*#__PURE__*/ _jsx("span", {
                                            className: "text-sm font-medium text-muted-foreground",
                                            children: t('shadcnAdmin:sidebarFields')
                                        }) : null,
                                        sidebarTop.map((f)=>renderChild(f, '', docPermissions))
                                    ]
                                }) : null
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsx(ResizableHandle, {
                        withHandle: true,
                        className: cn((!livePreviewOpen || builderModeOpen) && 'hidden')
                    }),
                    /*#__PURE__*/ _jsx(ResizablePanel, {
                        panelRef: previewPanelRef,
                        collapsible: true,
                        collapsedSize: "0%",
                        defaultSize: "0%",
                        minSize: "25%",
                        className: cn('min-w-0', previewAnimating && 'transition-[flex-basis] duration-300 ease-in-out'),
                        style: {
                            overflow: 'visible'
                        },
                        // Dragging the handle can collapse this panel directly (below
                        // its minSize snaps to collapsedSize) without going through the
                        // toggle button — keep `livePreviewOpen` (and the button's
                        // label) in sync either way. Also fires from our own
                        // resize()/collapse() calls above and on mount; setting the same
                        // boolean value React already has is a no-op. Only ever wired to
                        // `livePreviewOpen`, not `builderModeOpen` — builder mode is
                        // button-driven only (the handle that would let a user drag it
                        // is hidden in that state, see above), so there's no drag
                        // gesture here to sync back from.
                        onResize: (size)=>setLivePreviewOpen(size.asPercentage > 0),
                        children: /*#__PURE__*/ _jsx("div", {
                            className: livePreviewOpen ? 'h-full lg:pl-6' : undefined,
                            children: pageBuilderAvailable ? // `overflow: visible` here too — same sticky-positioning
                            // contract every other panel wrapper in this tree keeps (see
                            // LIVE-PREVIEW.md). The layers column is a plain flex sibling,
                            // NOT part of the nested (preview | settings) ResizablePanelGroup
                            // below — see LayersPanel's own doc comment for why a 3rd flat
                            // panel there would reintroduce the pivot-index bug
                            // `blockSettingsPanelRef` already had to work around once.
                            // Hidden on mobile: the nested group switches to vertical
                            // stacking there, which a fixed-width side column doesn't fit.
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex h-full",
                                style: {
                                    overflow: 'visible'
                                },
                                children: [
                                    builderModeOpen && !isMobile ? /*#__PURE__*/ _jsx(LayersPanel, {
                                        rows: layoutRows,
                                        blocks: layoutField?.blocks ?? [],
                                        onReorder: (next)=>setValueAtPath(layoutBasePath, next),
                                        onDuplicate: duplicateBlock,
                                        onDelete: deleteBlock,
                                        disabled: submitting
                                    }) : null,
                                    /*#__PURE__*/ _jsxs(ResizablePanelGroup, {
                                        orientation: isMobile ? 'vertical' : 'horizontal',
                                        className: "h-full flex-1 min-w-0 items-stretch gap-0",
                                        style: {
                                            overflow: 'visible'
                                        },
                                        children: [
                                            /*#__PURE__*/ _jsx(ResizablePanel, {
                                                defaultSize: "100%",
                                                minSize: "40%",
                                                className: "min-w-0",
                                                style: {
                                                    overflow: 'visible'
                                                },
                                                children: /*#__PURE__*/ _jsx(LivePreviewPanel, {
                                                    open: livePreviewOpen,
                                                    onBlockAction: handlePageBuilderAction,
                                                    builderMode: builderModeOpen,
                                                    previewData: previewData
                                                })
                                            }),
                                            /*#__PURE__*/ _jsx(ResizableHandle, {
                                                withHandle: true,
                                                className: cn(!selectedBlockId && 'hidden')
                                            }),
                                            /*#__PURE__*/ _jsx(ResizablePanel, {
                                                panelRef: blockSettingsPanelRef,
                                                collapsible: true,
                                                collapsedSize: "0%",
                                                defaultSize: "0%",
                                                minSize: "25%",
                                                className: cn('min-w-0', blockSettingsAnimating && 'transition-[flex-basis] duration-300 ease-in-out'),
                                                style: {
                                                    overflow: 'visible'
                                                },
                                                children: /*#__PURE__*/ _jsx("div", {
                                                    className: selectedBlockId ? 'h-full lg:pl-6' : undefined,
                                                    children: /*#__PURE__*/ _jsx(BlockSettingsPanel, {
                                                        rows: layoutRows,
                                                        blocks: layoutField?.blocks ?? [],
                                                        layoutBasePath: layoutBasePath,
                                                        renderChild: renderChild,
                                                        blockPerms: layoutFieldPerms,
                                                        disabled: submitting
                                                    })
                                                })
                                            })
                                        ]
                                    })
                                ]
                            }) : /*#__PURE__*/ _jsx(LivePreviewPanel, {
                                open: livePreviewOpen,
                                previewData: previewData
                            })
                        })
                    })
                ]
            }) : // No Live Preview on this collection — today's plain two-column
            // split, no Resizable overhead.
            /*#__PURE__*/ _jsxs("div", {
                className: hasSidebar ? 'flex flex-col gap-6 lg:flex-row' : 'flex flex-col gap-4',
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        className: hasSidebar ? 'flex flex-1 min-w-0 flex-col gap-4' : 'contents',
                        children: mainFieldsContent
                    }),
                    hasSidebar ? // The <aside> stretches to the row height so its left divider runs
                    // the full form length; the inner wrapper is the sticky part —
                    // pinned just below the sticky toolbar so the sidebar fields follow
                    // the scroll while they fit, and scroll off naturally when taller
                    // than the viewport (no inner scrollbar).
                    /*#__PURE__*/ _jsx("aside", {
                        className: "shrink-0 lg:w-72 lg:border-l lg:pl-6",
                        children: /*#__PURE__*/ _jsx("div", {
                            className: "flex flex-col gap-4 lg:sticky lg:top-16",
                            children: sidebarTop.map((f)=>renderChild(f, '', docPermissions))
                        })
                    }) : null
                ]
            }),
            pageBuilderAvailable ? /*#__PURE__*/ _jsx(BlockPickerSheet, {
                open: addBlockPickerOpen,
                onOpenChange: setAddBlockPickerOpen,
                blocks: layoutField?.blocks ?? [],
                onSelect: handleBlockPicked
            }) : null
        ]
    });
}

'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Hand-rolled Live Preview iframe panel. Payload's own LivePreview components
   (@payloadcms/ui's LivePreviewProvider/Toggler/Window) can't be dropped into
   this admin as-is — they depend on Payload's own <Form> context, and
   AutoDocFormBridge manages its own independent form state (values/dirty/
   setValueAtPath), not Payload's Form. This panel gets the practical result
   without that refactor: resolve the preview URL once (via a consumer-defined
   `/:slug/:id/preview-url` collection endpoint — see e.g. this starter's
   apps/cms Pages.ts), embed it in an iframe, and nudge it to refetch via
   postMessage each time a form change is actually persisted.

   Only reads state via context (useDocIdentity/useDocFormValues, both already
   populated by AutoDocFormBridge) — zero props beyond `open`, so it can be
   dropped in anywhere inside the bridge's <form> without prop drilling.

   The receiving frontend is expected to refetch its own draft content on
   message receipt (rich text / media are typically server-computed, so an
   in-browser field merge can't refresh them anyway) rather than have this
   side attempt Payload's full live-preview wire protocol — the
   `{ type: 'payload-live-preview' }` marker is all a refetch-based receiver
   needs, and is what apps/web/src/scripts/preview.ts listens for.

   Nudges on `lastSavedAt`, not on `values`. `values` changes on every
   keystroke, well before the bridge's autosave has actually persisted
   anything — autosave only *starts* its PATCH after a quiet window (800ms
   default, see draftsConfig.ts) and then round-trips to the server. An
   earlier version of this panel debounced its own postMessage against
   `values` on a fixed 400ms timer, independent of that autosave timer; being
   shorter, it always fired before the corresponding autosave had persisted,
   so the iframe refetched the *previous* save — a permanent one-edit lag.
   `lastSavedAt` (threaded through DocFormValuesContext) only changes once
   the bridge's PATCH actually succeeds, so nudging off it is inherently
   correctly ordered — no extra debounce needed here.

   Page-builder half (`pages` only — see AutoDocFormBridge's
   `pageBuilderActive`): the admin can never reach INTO the iframe (cross-
   origin), so this is the other direction of that same postMessage channel.
   `apps/web/src/lib/page-builder.ts` posts `{type:'payload-page-builder',
   action:'select'|'move'|'duplicate'|'delete'|'addRequest', ...}` out of the
   iframe on click/toolbar actions; this panel listens for those (origin-
   checked against the resolved preview URL) and either updates
   `selectedBlockId` directly (`select`) or forwards the row-mutation actions
   to `onBlockAction` (owned by the bridge, since only it has `setValueAtPath`
   and the current `values.layout`). Selection changes are posted back IN as
   `{action:'highlight', blockId}` so the iframe's own hover/selection overlay
   stays in sync with whatever's selected here (e.g. a click in
   BlockSettingsPanel, not just a click in the preview itself). */ import * as React from 'react';
import { ExternalLinkIcon, MonitorIcon, SmartphoneIcon, TabletIcon } from 'lucide-react';
import { cn, useDocFormValues, useDocIdentity, usePageBuilder } from 'payload-plugin-shadcn-ui';
import { formatAdminURL, useConfig, useTranslation } from '../../../internal/payloadAdapter.js';
// Fixed device widths (not user-resizable) — this mirrors the fixed
// breakpoints most CSS is actually written against, unlike the freeform
// drag-resize of the panel itself. `null` (desktop) fills the panel.
const DEVICE_WIDTH = {
    mobile: '375px',
    tablet: '768px',
    desktop: null
};
export function LivePreviewPanel({ open, onBlockAction, builderMode = false, previewData = null }) {
    const { t } = useTranslation();
    const { config } = useConfig();
    const apiRoute = config.routes?.api;
    const serverURL = config.serverURL;
    const { collectionSlug, documentId } = useDocIdentity();
    const { activeLocale, lastSavedAt, isUpdating } = useDocFormValues();
    const { selectedBlockId, setSelectedBlockId } = usePageBuilder();
    const locale = activeLocale ?? 'en';
    const [previewUrl, setPreviewUrl] = React.useState(null);
    // What the embedded iframe actually navigates to — `previewUrl` plus the
    // builder-mode query param. Kept as its own derived value (not folded into
    // `previewUrl` itself) so `previewUrl` stays the one thing every other
    // effect below (nudge, highlight-listener origin checks, detached tab)
    // reasons about, matching the one already-resolved token URL Payload's own
    // preview link would use.
    const iframeSrc = React.useMemo(()=>{
        if (!previewUrl) return null;
        try {
            const url = new URL(previewUrl);
            url.searchParams.set('pageBuilder', builderMode ? '1' : '0');
            return url.toString();
        } catch  {
            return previewUrl;
        }
    }, [
        previewUrl,
        builderMode
    ]);
    const [device, setDevice] = React.useState('desktop');
    const iframeRef = React.useRef(null);
    // Deliberately NOT opened with `noopener` — we need the WindowProxy back so
    // the save-nudge effect below can keep posting to a detached tab after it's
    // opened. This is a top-level nav to our own trusted preview origin (the
    // iframe already sends it the same token), not an untrusted third-party
    // link, so the usual tabnabbing rationale for `noopener` doesn't apply
    // here. Deliberately plain — no window-size features: browsers only honor
    // those at the moment a NAMED target is first created, will open it as an
    // ordinary tab regardless in many configurations anyway, and silently
    // ignore any later `resizeTo()` on a tab that isn't its own standalone
    // popup (tried and reverted — not worth the complexity for something the
    // browser won't reliably let a page control).
    const detachedWindowRef = React.useRef(null);
    // The resolved preview URL already carries the same token the iframe uses
    // (see the fetch below) — opening it as a top-level navigation is a
    // non-regression: the preview shell's own CSP (`frame-ancestors`) only
    // restricts *embedding*, not direct navigation. Reuses + refocuses an
    // already-open detached tab instead of stacking up duplicates.
    const openInNewTab = React.useCallback(()=>{
        if (!previewUrl) return;
        const existing = detachedWindowRef.current;
        if (existing && !existing.closed) {
            existing.focus();
            return;
        }
        detachedWindowRef.current = window.open(previewUrl, 'payload-live-preview-detached');
    }, [
        previewUrl
    ]);
    // Resolve the preview URL once per open/doc/locale — not on every keystroke.
    React.useEffect(()=>{
        if (!open || !collectionSlug || documentId == null) return;
        let cancelled = false;
        setPreviewUrl(null);
        fetch(formatAdminURL({
            apiRoute,
            path: `/${collectionSlug}/${documentId}/preview-url?locale=${encodeURIComponent(locale)}`,
            serverURL: serverURL || ''
        }), {
            credentials: 'include'
        }).then((res)=>res.ok ? res.json() : null).then((body)=>{
            if (!cancelled && body?.url) setPreviewUrl(body.url);
        }).catch(()=>{
        // Preview URL is a nicety, not a critical path — leave the panel empty.
        });
        return ()=>{
            cancelled = true;
        };
    }, [
        open,
        collectionSlug,
        documentId,
        locale,
        apiRoute,
        serverURL
    ]);
    // Nudge the iframe (and any detached tab) to refetch once the bridge
    // actually persists a save — see the note atop this file on why
    // `lastSavedAt`, not `values`. No debounce here: the bridge's own autosave
    // scheduler already provides the quiet-window debounce (draftsConfig.ts's
    // autosaveInterval) before a save even happens, and `lastSavedAt` only
    // changes once per completed save.
    //
    // Posted under `payload-live-preview-refetch`, NOT the canonical
    // `payload-live-preview` type (Live Preview Pass 2) — `PreviewApp`'s
    // `@payloadcms/live-preview` `subscribe()` treats ANY `payload-live-preview`
    // message with no `collectionSlug` as "reset to initialData" (verified in
    // its `handleMessage` source), which is exactly this nudge's shape. Renaming
    // it keeps it invisible to `subscribe()` entirely; only this component's own
    // `onMessage`-style listener (below, and the frontend's mirror of it) acts
    // on it, as a save/error reconciliation backstop for the merge sender below.
    //
    // The detached-tab branch deliberately ignores `open` (the embedded
    // panel's visibility) — this component never actually unmounts when
    // toggled closed (see `if (!open) return null` below; same component
    // instance, hooks/state persist), and a user who's popped the preview out
    // into its own tab reasonably expects it to keep updating even after
    // closing the embedded half.
    React.useEffect(()=>{
        if (!previewUrl || lastSavedAt == null) return;
        let targetOrigin;
        try {
            targetOrigin = new URL(previewUrl).origin;
        } catch  {
            return; // previewUrl not yet a valid absolute URL.
        }
        if (open) {
            const iframeWin = iframeRef.current?.contentWindow;
            if (iframeWin) {
                try {
                    iframeWin.postMessage({
                        type: 'payload-live-preview-refetch'
                    }, targetOrigin);
                } catch  {
                // Ignore — best-effort nudge.
                }
            }
        }
        const detachedWin = detachedWindowRef.current;
        if (detachedWin && !detachedWin.closed) {
            try {
                detachedWin.postMessage({
                    type: 'payload-live-preview-refetch'
                }, targetOrigin);
            } catch  {
            // Ignore — best-effort nudge.
            }
        }
    }, [
        lastSavedAt,
        open,
        previewUrl
    ]);
    // Live Preview Pass 2 — merge sender. Posts `previewData` (the doc-root
    // form state, locale-projected by the bridge) under the CANONICAL
    // `payload-live-preview` type — the one `PreviewApp`'s `subscribe()`
    // listens for, which POSTs it to Payload's findByID via a same-origin
    // proxy and gets back fresh `richText_html`/populated media computed from
    // this UNSAVED state (see LIVE-PREVIEW.md). Debounced ~200ms (keystroke
    // rate) — much shorter than the persisted-save nudge above, which stays as
    // a reconciliation backstop (e.g. after a save error).
    const previewDataRef = React.useRef(previewData);
    React.useEffect(()=>{
        previewDataRef.current = previewData;
    }, [
        previewData
    ]);
    const postMergeData = React.useCallback((targetOrigin)=>{
        const data = previewDataRef.current;
        if (data == null) return;
        const msg = {
            type: 'payload-live-preview',
            data,
            collectionSlug,
            locale: activeLocale
        };
        if (open) {
            const iframeWin = iframeRef.current?.contentWindow;
            if (iframeWin) {
                try {
                    iframeWin.postMessage(msg, targetOrigin);
                } catch  {
                // Ignore — best-effort.
                }
            }
        }
        const detachedWin = detachedWindowRef.current;
        if (detachedWin && !detachedWin.closed) {
            try {
                detachedWin.postMessage(msg, targetOrigin);
            } catch  {
            // Ignore — best-effort.
            }
        }
    }, [
        open,
        collectionSlug,
        activeLocale
    ]);
    React.useEffect(()=>{
        if (!previewUrl || previewData == null) return;
        let targetOrigin;
        try {
            targetOrigin = new URL(previewUrl).origin;
        } catch  {
            return;
        }
        const timer = window.setTimeout(()=>postMergeData(targetOrigin), 200);
        return ()=>window.clearTimeout(timer);
    }, [
        previewData,
        previewUrl,
        postMergeData
    ]);
    // Send once, immediately (no debounce), the moment the preview reports
    // `ready` (its outbound `{type:'payload-live-preview', ready:true}`
    // handshake) — syncs the preview before the first edit rather than waiting
    // on a `previewData` change.
    React.useEffect(()=>{
        if (!previewUrl) return;
        let targetOrigin;
        try {
            targetOrigin = new URL(previewUrl).origin;
        } catch  {
            return;
        }
        const onReady = (event)=>{
            if (event.origin !== targetOrigin) return;
            if (event.data?.type === 'payload-live-preview' && event.data?.ready === true) {
                postMergeData(targetOrigin);
            }
        };
        window.addEventListener('message', onReady);
        return ()=>window.removeEventListener('message', onReady);
    }, [
        previewUrl,
        postMergeData
    ]);
    // Inbound half of the page-builder protocol — see the file header comment.
    // Origin-checked against the resolved preview URL (same trust boundary the
    // save-nudge effect above uses to post OUT), not `event.origin` compared
    // against some separately-configured value, so there's exactly one source
    // of truth for "what origin is this iframe".
    React.useEffect(()=>{
        if (!previewUrl) return;
        let expectedOrigin;
        try {
            expectedOrigin = new URL(previewUrl).origin;
        } catch  {
            return;
        }
        const handleMessage = (event)=>{
            if (event.origin !== expectedOrigin) return;
            if (!event.data || event.data.type !== 'payload-page-builder') return;
            const { action } = event.data;
            if (action === 'select') {
                setSelectedBlockId(typeof event.data.blockId === 'string' ? event.data.blockId : null);
                return;
            }
            // Esc in the iframe (Phase 1b) clears its own local selection and
            // mirrors that out here, same as a `select` with no blockId.
            if (action === 'deselect') {
                setSelectedBlockId(null);
                return;
            }
            if (action === 'move' || action === 'duplicate' || action === 'delete' || action === 'addRequest') {
                onBlockAction?.(event.data);
            }
        };
        window.addEventListener('message', handleMessage);
        return ()=>window.removeEventListener('message', handleMessage);
    }, [
        previewUrl,
        onBlockAction,
        setSelectedBlockId
    ]);
    // Phase 1b — keyboard shortcuts on the selected block, admin-side mirror.
    // `page-builder.ts` installs the same shortcuts inside the iframe itself
    // (cross-origin, so this admin can't listen to keydowns in there); this
    // covers the case where focus is on the admin side instead (e.g. the
    // block settings panel). Guarded against text-entry targets so Delete/
    // Backspace don't hijack normal editing in a field.
    React.useEffect(()=>{
        if (!open || !builderMode || selectedBlockId == null) return;
        const onKeyDown = (e)=>{
            const target = e.target;
            if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') {
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                onBlockAction?.({
                    action: 'delete',
                    blockId: selectedBlockId
                });
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedBlockId(null);
            } else if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault();
                onBlockAction?.({
                    action: 'move',
                    blockId: selectedBlockId,
                    dir: 'up'
                });
            } else if (e.altKey && e.key === 'ArrowDown') {
                e.preventDefault();
                onBlockAction?.({
                    action: 'move',
                    blockId: selectedBlockId,
                    dir: 'down'
                });
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return ()=>window.removeEventListener('keydown', onKeyDown);
    }, [
        open,
        builderMode,
        selectedBlockId,
        onBlockAction,
        setSelectedBlockId
    ]);
    // Outbound highlight — mirrors `selectedBlockId` (which may have changed
    // from a click in BlockSettingsPanel, not just the preview itself) back
    // into the iframe/detached tab so its own overlay stays in sync. No
    // debounce needed: selection changes are user clicks, not a keystroke
    // stream.
    //
    // Skips the `null` (nothing selected) case entirely rather than actively
    // posting a "clear" message: the only way `selectedBlockId` is non-null in
    // the first place is a prior click in the iframe itself or an action that
    // originated from one of its own toolbar buttons — meaning the iframe is
    // already loaded by the time there's anything real to mirror. Posting on
    // mount (`selectedBlockId` starts `null`) had nothing useful to say anyway,
    // and did so before the iframe had necessarily finished navigating to
    // `previewUrl` — its `contentWindow` briefly has a different origin during
    // that load, so the post was silently dropped with a harmless but noisy
    // postMessage origin-mismatch console warning. `page-builder.ts`'s own
    // `onContentRebuilt` already clears a since-deleted block's outline/
    // toolbar locally on the next refetch, without needing this message.
    React.useEffect(()=>{
        if (!previewUrl || selectedBlockId == null) return;
        let targetOrigin;
        try {
            targetOrigin = new URL(previewUrl).origin;
        } catch  {
            return;
        }
        const msg = {
            type: 'payload-page-builder',
            action: 'highlight',
            blockId: selectedBlockId
        };
        if (open) {
            const iframeWin = iframeRef.current?.contentWindow;
            if (iframeWin) {
                try {
                    iframeWin.postMessage(msg, targetOrigin);
                } catch  {
                // Ignore — best-effort.
                }
            }
        }
        const detachedWin = detachedWindowRef.current;
        if (detachedWin && !detachedWin.closed) {
            try {
                detachedWin.postMessage(msg, targetOrigin);
            } catch  {
            // Ignore — best-effort.
            }
        }
    }, [
        selectedBlockId,
        open,
        previewUrl
    ]);
    if (!open) return null;
    const deviceOptions = [
        {
            mode: 'mobile',
            icon: SmartphoneIcon,
            label: t('shadcnAdmin:previewMobile')
        },
        {
            mode: 'tablet',
            icon: TabletIcon,
            label: t('shadcnAdmin:previewTablet')
        },
        {
            mode: 'desktop',
            icon: MonitorIcon,
            label: t('shadcnAdmin:previewDesktop')
        }
    ];
    const deviceWidth = DEVICE_WIDTH[device];
    return /*#__PURE__*/ _jsxs("div", {
        className: "flex flex-col overflow-hidden rounded-lg border bg-card lg:sticky lg:top-16 lg:h-[calc(100vh-5rem)]",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex shrink-0 items-center justify-between gap-2 border-b px-2 py-1.5",
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        className: "inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5",
                        role: "group",
                        "aria-label": t('shadcnAdmin:previewDeviceWidth'),
                        children: deviceOptions.map(({ mode, icon: Icon, label })=>/*#__PURE__*/ _jsx("button", {
                                type: "button",
                                "aria-label": label,
                                "aria-pressed": device === mode,
                                title: label,
                                onClick: ()=>setDevice(mode),
                                className: cn('inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground', device === mode && 'bg-background text-foreground shadow-sm'),
                                children: /*#__PURE__*/ _jsx(Icon, {
                                    className: "size-3.5"
                                })
                            }, mode))
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex items-center gap-3",
                        children: [
                            isUpdating ? /*#__PURE__*/ _jsxs("span", {
                                className: "flex items-center gap-1.5 text-xs text-muted-foreground",
                                "aria-live": "polite",
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "size-1.5 animate-pulse rounded-full bg-amber-500"
                                    }),
                                    t('shadcnAdmin:previewUpdating')
                                ]
                            }) : null,
                            /*#__PURE__*/ _jsx("button", {
                                type: "button",
                                "aria-label": t('shadcnAdmin:openPreviewInNewTab'),
                                title: t('shadcnAdmin:openPreviewInNewTab'),
                                onClick: openInNewTab,
                                disabled: !previewUrl,
                                className: "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40",
                                children: /*#__PURE__*/ _jsx(ExternalLinkIcon, {
                                    className: "size-3.5"
                                })
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "h-[70vh] min-h-0 overflow-auto bg-muted/40 p-4 lg:h-auto lg:flex-1",
                style: {
                    backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                },
                children: iframeSrc ? /*#__PURE__*/ _jsx("div", {
                    className: "mx-auto h-full overflow-hidden rounded-lg border bg-background shadow-sm",
                    style: deviceWidth ? {
                        width: deviceWidth
                    } : undefined,
                    children: /*#__PURE__*/ _jsx("iframe", {
                        ref: iframeRef,
                        src: iframeSrc,
                        title: "Live Preview",
                        className: "h-full w-full bg-background"
                    })
                }) : /*#__PURE__*/ _jsx("div", {
                    className: "flex h-full items-center justify-center rounded-lg border border-dashed bg-background text-sm text-muted-foreground",
                    children: "Loading preview…"
                })
            })
        ]
    });
}

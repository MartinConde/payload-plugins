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
export function LivePreviewPanel({ open, onBlockAction, builderMode = false }) {
    const { t } = useTranslation();
    const { config } = useConfig();
    const apiRoute = config.routes?.api;
    const serverURL = config.serverURL;
    const { collectionSlug, documentId } = useDocIdentity();
    const { activeLocale, lastSavedAt } = useDocFormValues();
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
                        type: 'payload-live-preview'
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
                    type: 'payload-live-preview'
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
        className: "flex flex-col overflow-hidden rounded-md border lg:sticky lg:top-16 lg:h-[calc(100vh-5rem)]",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex shrink-0 items-center justify-between gap-1 border-b bg-muted/40 px-2 py-1",
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        className: "flex items-center gap-1",
                        role: "group",
                        "aria-label": t('shadcnAdmin:previewDeviceWidth'),
                        children: deviceOptions.map(({ mode, icon: Icon, label })=>/*#__PURE__*/ _jsx("button", {
                                type: "button",
                                "aria-label": label,
                                "aria-pressed": device === mode,
                                title: label,
                                onClick: ()=>setDevice(mode),
                                className: cn('inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground', device === mode && 'bg-accent text-accent-foreground'),
                                children: /*#__PURE__*/ _jsx(Icon, {
                                    className: "size-3.5"
                                })
                            }, mode))
                    }),
                    /*#__PURE__*/ _jsx("button", {
                        type: "button",
                        "aria-label": t('shadcnAdmin:openPreviewInNewTab'),
                        title: t('shadcnAdmin:openPreviewInNewTab'),
                        onClick: openInNewTab,
                        disabled: !previewUrl,
                        className: "inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40",
                        children: /*#__PURE__*/ _jsx(ExternalLinkIcon, {
                            className: "size-3.5"
                        })
                    })
                ]
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "h-[70vh] min-h-0 overflow-auto bg-muted/20 lg:h-auto lg:flex-1",
                children: iframeSrc ? /*#__PURE__*/ _jsx("div", {
                    className: "mx-auto h-full",
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
                    className: "flex h-full items-center justify-center text-sm text-muted-foreground",
                    children: "Loading preview…"
                })
            })
        ]
    });
}

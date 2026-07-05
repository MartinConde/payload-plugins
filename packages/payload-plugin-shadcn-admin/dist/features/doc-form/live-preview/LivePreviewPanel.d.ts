import * as React from 'react';
/** Row-mutation half of the page-builder protocol — everything except
 *  `select`, which this panel handles itself via `usePageBuilder()`. */
export type PageBuilderBlockAction = {
    action: 'move';
    blockId: string;
    dir: 'up' | 'down';
} | {
    action: 'duplicate';
    blockId: string;
} | {
    action: 'delete';
    blockId: string;
} | {
    action: 'addRequest';
    afterBlockId: string | null;
};
export type LivePreviewPanelProps = {
    open: boolean;
    /** Owned by the bridge (needs `setValueAtPath` + current `values.layout`).
     *  Absent when the page builder isn't active for this collection — the
     *  message listener below still installs regardless, since a non-page-
     *  builder frontend will simply never send these messages. */
    onBlockAction?: (action: PageBuilderBlockAction) => void;
    /** Whether the "Edit blocks" toggle is on. Baked into the embedded
     *  iframe's URL as a `pageBuilder=1` query param (see LIVE-PREVIEW.md) —
     *  NOT a postMessage toggle. The frontend's `installPageBuilder` only
     *  ever runs when this is true at initial navigation, so preview-only
     *  mode gets a page with literally zero click/hover listeners, matching
     *  "the same as before the page-builder layer existed". Toggling this
     *  reloads the iframe (a deliberate, infrequent mode switch, not a
     *  keystroke-driven refetch) — the detached tab deliberately ignores it
     *  and always opens the plain non-builder URL (its `postMessage` target
     *  is itself, not the admin, so page-builder never had anything to talk
     *  to there anyway). */
    builderMode?: boolean;
};
export declare function LivePreviewPanel({ open, onBlockAction, builderMode, }: LivePreviewPanelProps): React.JSX.Element;

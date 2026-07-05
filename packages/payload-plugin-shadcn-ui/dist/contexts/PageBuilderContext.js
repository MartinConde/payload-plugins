'use client';
/* Which block (by its stable row `id`) is currently selected in the Live
   Preview page-builder layer, threaded between the two consumers that need
   it: `LivePreviewPanel` (posts the selection into the iframe as a
   `{action:'highlight'}` message so the preview's own hover/selection
   overlay stays in sync) and `BlockSettingsPanel` (renders only the
   selected row's fields). Mirrors DocFormValuesContext / DocIdentityContext.

   The bridge owns the `useState` and mounts the provider only when the page-
   builder is active for the current collection (see AutoDocFormBridge's
   `pageBuilderActive`); `null` outside that (or before anything is selected)
   is a valid, expected state, not an error. */ import * as React from 'react';
const NOOP_SET = (_blockId)=>{};
const PageBuilderContext = /*#__PURE__*/ React.createContext({
    selectedBlockId: null,
    setSelectedBlockId: NOOP_SET
});
export const PageBuilderProvider = PageBuilderContext.Provider;
export const usePageBuilder = ()=>React.useContext(PageBuilderContext);

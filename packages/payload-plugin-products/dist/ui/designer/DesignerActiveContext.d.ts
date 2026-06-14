import * as React from 'react';
export type DesignerActive = {
    activeView: number;
    activeColor: number;
    setActiveView: (i: number) => void;
    setActiveColor: (i: number) => void;
    colorSwatchesSlug: string;
    printTemplatesSlug: string;
    mediaCollectionSlug: string;
};
export declare const DesignerActiveProvider: React.Provider<DesignerActive>;
export declare function useDesignerActive(): DesignerActive;
/** Optional accessor — returns null outside a provider (e.g. when the Sync tab
 *  is rendered standalone in a future test). */
export declare function useDesignerActiveOptional(): DesignerActive | null;

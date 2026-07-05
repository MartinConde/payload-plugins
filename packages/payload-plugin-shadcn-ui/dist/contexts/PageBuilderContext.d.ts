import * as React from 'react';
type PageBuilderContextValue = {
    /** Row `id` of the currently selected block, or `null` if none. */
    selectedBlockId: string | null;
    setSelectedBlockId: (blockId: string | null) => void;
};
export declare const PageBuilderProvider: React.Provider<PageBuilderContextValue>;
export declare const usePageBuilder: () => PageBuilderContextValue;
export {};

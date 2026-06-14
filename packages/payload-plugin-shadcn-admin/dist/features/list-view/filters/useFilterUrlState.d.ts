import * as React from 'react';
import { type FilterChip, type FilterGroup, type FilterNode, type FilterState, type FilterValue, type WhereOperator } from './filterCodec.js';
type UseFilterUrlStateResult = {
    state: FilterState;
    hasAnyFilter: boolean;
    addChip: (chip: Omit<FilterChip, 'id'>) => string;
    updateChip: (id: string, patch: Partial<Omit<FilterChip, 'id'>>) => void;
    removeChip: (id: string) => void;
    moveChip: (id: string, direction: -1 | 1) => void;
    /** Toggle whether this chip OR-joins the previous sibling. */
    toggleOrJoin: (id: string) => void;
    clearAll: () => void;
    /** Replace the entire state (used when hydrating from preferences). */
    replaceState: (next: FilterState) => void;
    /** Ref that flips to true on the first user-driven mutation. Read by
     *  usePreferencesSync to decide whether a late hydration would clobber
     *  user work. StrictMode-safe — only set inside action callbacks. */
    interactedRef: React.MutableRefObject<boolean>;
};
export declare function useFilterUrlState(): UseFilterUrlStateResult;
export type { FilterChip, FilterGroup, FilterNode, FilterState, FilterValue, WhereOperator, };

import * as React from 'react';
import { type FilterState } from '../filters/filterCodec.js';
type Options = {
    collectionSlug: string;
    state: FilterState;
    onHydrate: (state: FilterState) => void;
    /** Ref from useFilterUrlState — flips to true on the first user-driven
     *  mutation. Used to gate late-arriving hydrations so they don't clobber
     *  user work. */
    interactedRef: React.MutableRefObject<boolean>;
};
export declare function usePreferencesSync({ collectionSlug, state, onHydrate, interactedRef, }: Options): void;
export {};

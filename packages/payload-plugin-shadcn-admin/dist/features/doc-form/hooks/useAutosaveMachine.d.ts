import * as React from 'react';
export type AutosaveMachine = {
    autosaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
    autosaveAbortRef: React.MutableRefObject<AbortController | null>;
    manualSaveInFlightRef: React.MutableRefObject<boolean>;
    autosaveInFlightRef: React.MutableRefObject<boolean>;
    /** Path→value snapshot captured at autosave submit time. References
     *  returned by `getByPath` are stable across `setByPath` mutations on
     *  disjoint paths, so deep-equality against this snapshot is the correct
     *  compare for the success-cleanup prune. */
    autosaveSnapshotRef: React.MutableRefObject<Map<string, unknown> | null>;
    /** Locale active at snapshot time — scopes the dirtyLocales prune to the
     *  locale actually shipped (a locale switch mid-flight must not blow away
     *  edits in the new locale). */
    autosaveSnapshotLocaleRef: React.MutableRefObject<string | null>;
};
export declare function useAutosaveMachine(): AutosaveMachine;
export type UseAutosaveSchedulerArgs = {
    autosaveTimerRef: AutosaveMachine['autosaveTimerRef'];
    autosaveAbortRef: AutosaveMachine['autosaveAbortRef'];
    manualSaveInFlightRef: AutosaveMachine['manualSaveInFlightRef'];
    draftsEnabled: boolean;
    autosaveInterval: number | null;
    isGlobal: boolean;
    mode: 'create' | 'edit';
    docId: string | number | undefined;
    autosavePaused: boolean;
    dirty: Set<string>;
    values: Record<string, unknown>;
    /** `() => void submit('autosave')` — deliberately not required to be
     *  referentially stable; it's read fresh on every effect run via the
     *  normal dep-array mechanism (it's listed in the deps below), same as
     *  the original inline effect depending on `submit` directly. */
    onAutosave: () => void;
};
/** Debounce-then-fire scheduler + unmount cleanup. Call once `submit` exists
 *  in the bridge, passing `() => void submit('autosave')` as `onAutosave`. */
export declare function useAutosaveScheduler({ autosaveTimerRef, autosaveAbortRef, manualSaveInFlightRef, draftsEnabled, autosaveInterval, isGlobal, mode, docId, autosavePaused, dirty, values, onAutosave, }: UseAutosaveSchedulerArgs): void;

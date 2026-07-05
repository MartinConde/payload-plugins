'use client';
/* Owns the v3.6 autosave concurrency primitives: the debounce timer, the
   in-flight abort controller, the manual/autosave in-flight locks, and the
   path→value snapshot captured at autosave submit time (used by `submit`'s
   success cleanup to decide whether a dirty path is still dirty relative to
   what the autosave PATCH actually shipped). `submit`'s own body is NOT
   moved here — it stays in the bridge and closes over these same ref
   objects, reading/writing them exactly as before (see REVIEW-FINDINGS.md
   3.2). No behavior change.

   Split into two hooks, not one, for an unavoidable ordering reason: `submit`
   references these refs by bare identifier in its own `useCallback` body, so
   the refs must exist (be in scope) BEFORE `submit` is declared — but the
   scheduler effect needs to CALL `submit('autosave')`, so it must be wired
   up AFTER `submit` exists. `useAutosaveMachine` creates the refs (call
   first); `useAutosaveScheduler` owns the debounce-then-fire effect and the
   unmount cleanup (call after `submit` is defined, passing `() =>
   submit('autosave')`). */ import * as React from 'react';
export function useAutosaveMachine() {
    const autosaveTimerRef = React.useRef(null);
    const autosaveAbortRef = React.useRef(null);
    const manualSaveInFlightRef = React.useRef(false);
    const autosaveSnapshotRef = React.useRef(null);
    const autosaveSnapshotLocaleRef = React.useRef(null);
    const autosaveInFlightRef = React.useRef(false);
    return {
        autosaveTimerRef,
        autosaveAbortRef,
        manualSaveInFlightRef,
        autosaveInFlightRef,
        autosaveSnapshotRef,
        autosaveSnapshotLocaleRef
    };
}
/** Debounce-then-fire scheduler + unmount cleanup. Call once `submit` exists
 *  in the bridge, passing `() => void submit('autosave')` as `onAutosave`. */ export function useAutosaveScheduler({ autosaveTimerRef, autosaveAbortRef, manualSaveInFlightRef, draftsEnabled, autosaveInterval, isGlobal, mode, docId, autosavePaused, dirty, values, onAutosave }) {
    // ── Autosave scheduler ────────────────────────────────────────────────
    // Debounce against value/dirty changes. When drafts + autosave are on,
    // schedule a single autosave per quiet window. Skip when paused, when a
    // manual save is in flight, when there's nothing dirty, and when we're
    // on a create view (no id to PATCH).
    React.useEffect(()=>{
        if (!draftsEnabled || autosaveInterval === null) return;
        // Globals autosave (singleton, no id); collections require edit-mode + id.
        if (!isGlobal && (mode !== 'edit' || docId === undefined)) return;
        if (autosavePaused) return;
        if (manualSaveInFlightRef.current) return;
        if (dirty.size === 0) return;
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(()=>{
            autosaveTimerRef.current = null;
            onAutosave();
        }, autosaveInterval);
        return ()=>{
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
        };
    }, [
        draftsEnabled,
        autosaveInterval,
        isGlobal,
        mode,
        docId,
        autosavePaused,
        dirty,
        values,
        onAutosave
    ]);
    // Cancel in-flight autosave + clear scheduler on unmount.
    React.useEffect(()=>()=>{
            if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
            if (autosaveAbortRef.current) autosaveAbortRef.current.abort();
        }, []);
}

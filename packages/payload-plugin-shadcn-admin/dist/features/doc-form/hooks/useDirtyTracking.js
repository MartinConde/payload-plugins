'use client';
/* Owns the doc form's dirty-path bookkeeping: `dirty` (the Set<string> of
   dotted paths with unsaved edits — drives the "any dirty?" UX) and
   `dirtyLocalesRef` (which locales of a given path are dirty, for v3.8
   per-locale save/autosave cleanup). The two must always move together —
   every mutation site in AutoDocFormBridge touched both by hand before this
   extraction, and the two success-cleanup call sites in `submit` duplicated
   nearly identical prune logic. This hook is that shared logic, extracted
   verbatim (see REVIEW-FINDINGS.md 3.2) — no behavior change. `dirtyRef`
   mirrors `dirty` via effect, same as before, so the async autosave path in
   `submit` keeps reading the ref while the manual path reads the state. */ import * as React from 'react';
export function useDirtyTracking() {
    const [dirty, setDirty] = React.useState(()=>new Set());
    const dirtyRef = React.useRef(dirty);
    React.useEffect(()=>{
        dirtyRef.current = dirty;
    }, [
        dirty
    ]);
    const dirtyLocalesRef = React.useRef(new Map());
    const markDirty = React.useCallback((path, locale)=>{
        setDirty((prevDirty)=>{
            const copy = new Set(prevDirty);
            copy.add(path);
            return copy;
        });
        if (locale) {
            const set = dirtyLocalesRef.current.get(path) ?? new Set();
            set.add(locale);
            dirtyLocalesRef.current.set(path, set);
        }
    }, []);
    const resetDirty = React.useCallback(()=>{
        setDirty(new Set());
        dirtyLocalesRef.current = new Map();
    }, []);
    const pruneDirtyConditional = React.useCallback((locale, shouldClear)=>{
        setDirty((prev)=>{
            let changed = false;
            const next = new Set();
            for (const path of prev){
                if (!shouldClear(path)) {
                    next.add(path);
                    continue;
                }
                changed = true;
                if (locale) {
                    const set = dirtyLocalesRef.current.get(path);
                    if (set) {
                        set.delete(locale);
                        if (set.size === 0) dirtyLocalesRef.current.delete(path);
                        else {
                            // Other locales still dirty — keep path in dirty Set.
                            next.add(path);
                        }
                    }
                }
            }
            return changed ? next : prev;
        });
    }, []);
    const pruneDirtyForLocale = React.useCallback((locale)=>{
        setDirty((prev)=>{
            const next = new Set();
            for (const path of prev){
                const set = dirtyLocalesRef.current.get(path);
                if (set) {
                    set.delete(locale);
                    if (set.size === 0) dirtyLocalesRef.current.delete(path);
                    else {
                        next.add(path);
                        continue;
                    }
                }
            // Non-localized dirty path: cleared by this save.
            }
            return next;
        });
    }, []);
    return {
        dirty,
        dirtyRef,
        markDirty,
        resetDirty,
        pruneDirtyConditional,
        pruneDirtyForLocale
    };
}

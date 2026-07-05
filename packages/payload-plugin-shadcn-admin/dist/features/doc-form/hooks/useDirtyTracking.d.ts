import * as React from 'react';
export type DirtyTracking = {
    dirty: Set<string>;
    dirtyRef: React.MutableRefObject<Set<string>>;
    /** Marks `path` dirty; if `locale` is set, also records that locale as
     *  dirty for `path` (v3.8 per-locale tracking). Mirrors the write side of
     *  `setValueAtPath`. */
    markDirty: (path: string, locale: string | null) => void;
    /** Full reset — re-baselining (fresh doc payload) and Discard both want
     *  this exact shape. */
    resetDirty: () => void;
    /** Autosave success cleanup: for each currently-dirty path, drop it only
     *  when `shouldClear(path)` is true (the autosave snapshot cleanup checks
     *  the current value still deep-equals what was shipped). When `locale`
     *  is set, clearing only removes that locale from `dirtyLocalesRef`; the
     *  path itself stays dirty if another locale's edit is still pending. A
     *  no-op state update is skipped (mirrors the original's `changed`
     *  guard, avoiding a wasted re-render when nothing actually cleared). */
    pruneDirtyConditional: (locale: string | null, shouldClear: (path: string) => boolean) => void;
    /** Manual per-locale save success: every currently-dirty path clears
     *  unconditionally for `locale` (the whole active-locale slice was just
     *  shipped); a path stays dirty only if another locale is still pending. */
    pruneDirtyForLocale: (locale: string) => void;
};
export declare function useDirtyTracking(): DirtyTracking;

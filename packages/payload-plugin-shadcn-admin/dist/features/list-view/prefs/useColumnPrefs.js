'use client';
/* Persists per-collection column order + visibility to Payload's preferences
   API. Mirrors usePreferencesSync's REST flow (find → create | patch) and
   doc-id caching so we don't hit the d1-sqlite upsert no-op.

   Preference shape:
     { schemaVersion: 1, order: string[], visibility: Record<string, boolean> }
   The persisted `order` array contains only user-orderable column ids —
   locked columns (e.g. 'select') are excluded from it. Callers (e.g.
   CollectionListViewClient via resolveColumnOrder) re-insert locked ids
   when handing the order to TanStack.

   `order: undefined` in the returned state means "no preference saved" —
   distinct from `[]`. After `reset()`, future no-op state changes do NOT
   auto-resave: writes are gated on `interactedRef` so the user has to
   actively change something before we start persisting again. */ import * as React from 'react';
const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 800;
const prefKey = (collectionSlug)=>`collection-list-columns-${collectionSlug}`;
export function useColumnPrefs(collectionSlug) {
    const [state, setState] = React.useState({
        order: undefined,
        visibility: {},
        loaded: false
    });
    const hydratedRef = React.useRef(false);
    const interactedRef = React.useRef(false);
    const timerRef = React.useRef(null);
    const pendingRef = React.useRef(null);
    const dirtyRef = React.useRef(false);
    // null = unknown, false = confirmed missing, string = existing doc id
    const prefDocIdRef = React.useRef(null);
    const findPrefDoc = React.useCallback(async (key)=>{
        const params = new URLSearchParams();
        params.set('where[key][equals]', key);
        params.set('limit', '1');
        params.set('depth', '0');
        try {
            const res = await fetch(`/api/payload-preferences?${params.toString()}`, {
                credentials: 'include'
            });
            if (!res.ok) return null;
            const body = await res.json();
            const doc = body.docs?.[0];
            if (!doc) return null;
            return {
                id: String(doc.id),
                value: doc.value ?? null
            };
        } catch  {
            return null;
        }
    }, []);
    const writePrefDoc = React.useCallback(async (key, value)=>{
        let id = prefDocIdRef.current;
        if (id === null) {
            const found = await findPrefDoc(key);
            id = found?.id ?? false;
            prefDocIdRef.current = id;
        }
        try {
            if (id) {
                const res = await fetch(`/api/payload-preferences/${id}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        value
                    })
                });
                if (res.status === 404) prefDocIdRef.current = null;
                return;
            }
            const res = await fetch('/api/payload-preferences', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key,
                    value
                })
            });
            if (!res.ok) return;
            const body = await res.json();
            if (body.doc?.id) prefDocIdRef.current = String(body.doc.id);
        } catch  {
        // Next write will retry.
        }
    }, [
        findPrefDoc
    ]);
    const deletePrefDoc = React.useCallback(async ()=>{
        const id = prefDocIdRef.current;
        if (!id) return;
        try {
            await fetch(`/api/payload-preferences/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
        } catch  {
        // Best-effort.
        }
        prefDocIdRef.current = false;
    }, []);
    // Hydrate on mount.
    React.useEffect(()=>{
        if (hydratedRef.current) return;
        hydratedRef.current = true;
        let cancelled = false;
        void (async ()=>{
            const found = await findPrefDoc(prefKey(collectionSlug));
            prefDocIdRef.current = found?.id ?? false;
            if (cancelled) return;
            const stored = found?.value;
            if (!stored || stored.schemaVersion !== SCHEMA_VERSION) {
                setState((prev)=>({
                        ...prev,
                        loaded: true
                    }));
                return;
            }
            setState({
                order: Array.isArray(stored.order) ? stored.order : undefined,
                visibility: stored.visibility && typeof stored.visibility === 'object' ? stored.visibility : {},
                loaded: true
            });
        })();
        return ()=>{
            cancelled = true;
        };
    }, [
        collectionSlug,
        findPrefDoc
    ]);
    const flushNow = React.useCallback(()=>{
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (!dirtyRef.current) return;
        const pending = pendingRef.current;
        if (!pending) return;
        dirtyRef.current = false;
        const value = {
            schemaVersion: SCHEMA_VERSION,
            // Persist [] for an explicitly-empty order, but skip writes entirely
            // when nothing has been set (interactedRef gates that).
            order: pending.order ?? [],
            visibility: pending.visibility
        };
        void writePrefDoc(prefKey(collectionSlug), value);
    }, [
        collectionSlug,
        writePrefDoc
    ]);
    const scheduleWrite = React.useCallback((next)=>{
        pendingRef.current = next;
        if (!interactedRef.current) return;
        dirtyRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flushNow, DEBOUNCE_MS);
    }, [
        flushNow
    ]);
    const setOrder = React.useCallback((next)=>{
        interactedRef.current = true;
        setState((prev)=>{
            const updated = {
                ...prev,
                order: next
            };
            scheduleWrite({
                order: next,
                visibility: prev.visibility
            });
            return updated;
        });
    }, [
        scheduleWrite
    ]);
    const setVisibility = React.useCallback((next)=>{
        interactedRef.current = true;
        setState((prev)=>{
            const updated = {
                ...prev,
                visibility: next
            };
            scheduleWrite({
                order: prev.order,
                visibility: next
            });
            return updated;
        });
    }, [
        scheduleWrite
    ]);
    const reset = React.useCallback(()=>{
        // Cancel any pending write so the about-to-be-deleted doc isn't
        // re-created moments later.
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        dirtyRef.current = false;
        pendingRef.current = null;
        interactedRef.current = false;
        void deletePrefDoc();
        setState({
            order: undefined,
            visibility: {},
            loaded: true
        });
    }, [
        deletePrefDoc
    ]);
    // Flush on tab hide / unload / unmount so debounced writes don't get lost.
    React.useEffect(()=>{
        const onVisibility = ()=>{
            if (document.visibilityState === 'hidden') flushNow();
        };
        window.addEventListener('beforeunload', flushNow);
        document.addEventListener('visibilitychange', onVisibility);
        return ()=>{
            window.removeEventListener('beforeunload', flushNow);
            document.removeEventListener('visibilitychange', onVisibility);
            flushNow();
        };
    }, [
        flushNow
    ]);
    return {
        order: state.order,
        visibility: state.visibility,
        loaded: state.loaded,
        setOrder,
        setVisibility,
        reset
    };
}

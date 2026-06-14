'use client';
/* Write-behind cache for filter chip state to Payload's preferences API.

   Talks to the `payload-preferences` collection through the standard
   collection REST endpoints (find → create or update by id) rather than
   the dedicated `/api/payload-preferences/:key` upsert route.

   The dedicated route routes through `payload.db.upsert`, which the
   `@payloadcms/db-d1-sqlite` adapter aliases to `updateOne` without
   passing `options.upsert: true`. The result: the first write for any
   new key silently no-ops while returning 200 "Updated successfully", so
   persistence appears broken. The collection REST endpoints don't have
   that quirk and behave the same on every adapter Payload ships, so we
   use them and skip `@payloadcms/ui`'s `usePreferences` hook entirely.

   URL is the authoritative source of truth — preferences only hydrate the
   state on first mount when the URL has no `where[*]` keys AND the user
   hasn't interacted yet. After that, every filter mutation also writes
   (debounced) so a fresh tab on the same collection rehydrates its
   last-session filters.

   Preference shape: { schemaVersion: number; state: FilterState }. Older
   schemas are discarded. */ import * as React from 'react';
import { FILTER_STATE_SCHEMA_VERSION } from '../filters/filterCodec.js';
const DEBOUNCE_MS = 800;
const prefKey = (collectionSlug)=>`collection-list-filters-${collectionSlug}`;
/* Pending (value-less) chips don't belong in persisted prefs — they're
   ephemeral UI state. Persisting them means a future session can hydrate a
   ghost chip with no value. */ const chipIsPersistable = (chip)=>{
    if (chip.operator === 'exists') return chip.value !== null;
    if (chip.operator === 'in' || chip.operator === 'not_in') {
        return Array.isArray(chip.value) && chip.value.length > 0;
    }
    if (typeof chip.value === 'boolean') return true;
    return chip.value !== null && chip.value !== undefined && chip.value !== '';
};
const stripValuelessChips = (state)=>{
    const nodes = [];
    for (const node of state.nodes){
        if (node.kind === 'chip') {
            if (chipIsPersistable(node.chip)) nodes.push(node);
            continue;
        }
        const chips = node.group.chips.filter(chipIsPersistable);
        if (chips.length === 0) continue;
        nodes.push({
            kind: 'group',
            group: {
                ...node.group,
                chips
            }
        });
    }
    return {
        nodes
    };
};
const urlHasFiltersNow = ()=>{
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    for (const k of params.keys()){
        if (k.startsWith('where[') || k === 'where') return true;
    }
    return false;
};
export function usePreferencesSync({ collectionSlug, state, onHydrate, interactedRef }) {
    const hydratedRef = React.useRef(false);
    const timerRef = React.useRef(null);
    const pendingRef = React.useRef(null);
    const dirtyRef = React.useRef(false);
    // Cache the prefs document id between writes so we PATCH rather than re-find
    // every time. `null` = unknown (need to find), `false` = confirmed missing
    // (next write should CREATE), string = existing doc id (next write PATCHes).
    const prefDocIdRef = React.useRef(null);
    const onHydrateRef = React.useRef(onHydrate);
    onHydrateRef.current = onHydrate;
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
                // Doc may have been deleted out-of-band; force a re-find next time.
                if (res.status === 404) prefDocIdRef.current = null;
                return;
            }
            // No existing doc — CREATE. The `user` field's beforeValidate hook
            // auto-populates from req.user, so we don't send it.
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
        // Ignore; the next write attempt will retry.
        }
    }, [
        findPrefDoc
    ]);
    // Hydrate from prefs on mount when URL has no filters and the user has
    // not yet interacted.
    React.useEffect(()=>{
        if (hydratedRef.current) return;
        hydratedRef.current = true;
        if (urlHasFiltersNow()) return;
        let cancelled = false;
        void (async ()=>{
            const found = await findPrefDoc(prefKey(collectionSlug));
            prefDocIdRef.current = found?.id ?? false;
            if (cancelled) return;
            // Re-gate at resolve time. The user may have interacted while the
            // fetch was in flight; even if they ended up with an empty URL,
            // hydrating would clobber their session.
            if (interactedRef.current) return;
            if (urlHasFiltersNow()) return;
            const stored = found?.value;
            if (!stored || stored.schemaVersion !== FILTER_STATE_SCHEMA_VERSION) {
                return;
            }
            if (!stored.state || !Array.isArray(stored.state.nodes)) return;
            if (stored.state.nodes.length === 0) return;
            onHydrateRef.current(stored.state);
        })();
        return ()=>{
            cancelled = true;
        };
    }, [
        collectionSlug,
        findPrefDoc,
        interactedRef
    ]);
    const flushNow = React.useCallback(()=>{
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (!dirtyRef.current) return;
        const pending = pendingRef.current;
        if (!pending) return;
        const payload = {
            schemaVersion: FILTER_STATE_SCHEMA_VERSION,
            state: stripValuelessChips(pending)
        };
        dirtyRef.current = false;
        void writePrefDoc(prefKey(collectionSlug), payload);
    }, [
        collectionSlug,
        writePrefDoc
    ]);
    // Debounced write-behind on state changes after hydration completes.
    // We always snapshot the latest state into `pendingRef` (so flushes have
    // the right value), but we only mark `dirtyRef` and schedule a POST when
    // the user has actually interacted. Without that gate, a fresh visit
    // followed by quick navigation-away would overwrite the user's saved
    // filters with the empty state from the brief mount.
    React.useEffect(()=>{
        if (!hydratedRef.current) return;
        pendingRef.current = state;
        if (!interactedRef.current) return;
        dirtyRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flushNow, DEBOUNCE_MS);
        return ()=>{
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [
        state,
        flushNow,
        interactedRef
    ]);
    // Flush on tab hide / unload AND on component unmount. In-app navigation
    // unmounts FilterBar but fires neither `beforeunload` nor
    // `visibilitychange` — without the unmount flush the debounced write
    // would be silently dropped. The fetch is fire-and-forget; the browser
    // keeps it alive after the React tree tears down.
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
}

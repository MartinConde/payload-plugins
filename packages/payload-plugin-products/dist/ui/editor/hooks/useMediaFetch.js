'use client';
/* Resolve the sibling mockup upload field's value into a {url, width, height}
   triple. Reads from shadcn-admin's doc-form values context (Payload's own
   `useFormFields` is not wired in this slot). Tolerates the three shapes the
   upload field can produce: a bare id string, a polymorphic `{value}` envelope,
   or a populated `{id, ...}` doc. */ import * as React from 'react';
import { useConfig } from '@payloadcms/ui';
import { useDocFormFieldValue } from 'payload-plugin-shadcn-ui';
const FETCH_DEBOUNCE_MS = 250;
export function useMediaFetch(mediaSlug, fieldPath = 'mockup') {
    const { config } = useConfig();
    const apiBase = React.useMemo(()=>{
        const server = config?.serverURL || '';
        const api = config?.routes?.api || '/api';
        return `${server}${api}`;
    }, [
        config
    ]);
    const mockupRaw = useDocFormFieldValue(fieldPath);
    const mockupId = React.useMemo(()=>{
        if (mockupRaw == null || mockupRaw === '') return undefined;
        if (typeof mockupRaw === 'object') {
            const o = mockupRaw;
            const v = o.value ?? o.id;
            return v == null ? undefined : String(v);
        }
        return String(mockupRaw);
    }, [
        mockupRaw
    ]);
    const [loadState, setLoadState] = React.useState('no-id');
    const [media, setMedia] = React.useState(null);
    React.useEffect(()=>{
        if (!mockupId) {
            setLoadState('no-id');
            setMedia(null);
            return;
        }
        let cancelled = false;
        setLoadState('loading');
        const handle = setTimeout(async ()=>{
            try {
                const res = await fetch(`${apiBase}/${mediaSlug}/${mockupId}?depth=0`, {
                    credentials: 'include'
                });
                if (!res.ok || cancelled) {
                    if (!cancelled) setLoadState('error');
                    return;
                }
                const doc = await res.json();
                const url = typeof doc.url === 'string' ? doc.url : '';
                const width = typeof doc.width === 'number' ? doc.width : 0;
                const height = typeof doc.height === 'number' ? doc.height : 0;
                if (cancelled) return;
                if (!url || width <= 0 || height <= 0) {
                    setLoadState('error');
                    return;
                }
                setMedia({
                    id: mockupId,
                    url,
                    width,
                    height
                });
                setLoadState('loaded');
            } catch  {
                if (!cancelled) setLoadState('error');
            }
        }, FETCH_DEBOUNCE_MS);
        return ()=>{
            cancelled = true;
            clearTimeout(handle);
        };
    }, [
        mockupId,
        mediaSlug,
        apiBase
    ]);
    return {
        loadState,
        media
    };
}

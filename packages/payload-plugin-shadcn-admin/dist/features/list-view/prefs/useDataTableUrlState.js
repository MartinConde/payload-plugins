'use client';
/* URL <-> TanStack state sync for server-driven DataTable on Payload list views.

   Payload owns the URL scheme; this hook reads/writes the same keys Payload
   parses on the server (so the same URL produces the same data round-trip):
   - page=2                       1-based; absent means page 1
   - limit=20                     absent means defaultPageSize
   - sort=-email                  '-' prefix means desc; single column only
   - where[field][contains]=foo   one entry per column filter (contains-op v1)

   Changing sort or filters resets page to 1. Uses router.replace so history
   isn't polluted by every filter keystroke. */ import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
export const DEFAULT_PAGE_SIZE = 10;
const WHERE_KEY_RE = /^where\[([^\]]+)\]\[([^\]]+)\]$/;
export function useDataTableUrlState({ defaultPageSize = DEFAULT_PAGE_SIZE } = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const pagination = React.useMemo(()=>({
            pageIndex: Math.max(0, Number(searchParams.get('page') ?? 1) - 1),
            pageSize: Number(searchParams.get('limit') ?? defaultPageSize)
        }), [
        searchParams,
        defaultPageSize
    ]);
    const sorting = React.useMemo(()=>{
        const sort = searchParams.get('sort');
        if (!sort) return [];
        const desc = sort.startsWith('-');
        return [
            {
                id: desc ? sort.slice(1) : sort,
                desc
            }
        ];
    }, [
        searchParams
    ]);
    const search = searchParams.get('search') ?? '';
    const columnFilters = React.useMemo(()=>{
        const filters = [];
        searchParams.forEach((value, key)=>{
            const match = WHERE_KEY_RE.exec(key);
            if (match && match[2] === 'contains') {
                filters.push({
                    id: match[1],
                    value
                });
            }
        });
        return filters;
    }, [
        searchParams
    ]);
    const updateParams = React.useCallback((mutate)=>{
        const params = new URLSearchParams(searchParams.toString());
        mutate(params);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, {
            scroll: false
        });
    }, [
        router,
        pathname,
        searchParams
    ]);
    const onPaginationChange = React.useCallback((updater)=>{
        const next = typeof updater === 'function' ? updater(pagination) : updater;
        updateParams((p)=>{
            if (next.pageIndex === 0) p.delete('page');
            else p.set('page', String(next.pageIndex + 1));
            if (next.pageSize === defaultPageSize) p.delete('limit');
            else p.set('limit', String(next.pageSize));
        });
    }, [
        pagination,
        updateParams,
        defaultPageSize
    ]);
    const onSortingChange = React.useCallback((updater)=>{
        const next = typeof updater === 'function' ? updater(sorting) : updater;
        updateParams((p)=>{
            if (next.length === 0) p.delete('sort');
            else {
                const first = next[0];
                p.set('sort', first.desc ? `-${first.id}` : first.id);
            }
            p.delete('page');
        });
    }, [
        sorting,
        updateParams
    ]);
    const onColumnFiltersChange = React.useCallback((updater)=>{
        const next = typeof updater === 'function' ? updater(columnFilters) : updater;
        updateParams((p)=>{
            // Remove all existing where[*][contains] keys we manage
            Array.from(p.keys()).filter((k)=>{
                const m = WHERE_KEY_RE.exec(k);
                return m !== null && m[2] === 'contains';
            }).forEach((k)=>p.delete(k));
            next.forEach((f)=>{
                if (f.value !== undefined && f.value !== '') {
                    p.set(`where[${f.id}][contains]`, String(f.value));
                }
            });
            p.delete('page');
        });
    }, [
        columnFilters,
        updateParams
    ]);
    const onSearchChange = React.useCallback((value)=>{
        updateParams((p)=>{
            if (value) p.set('search', value);
            else p.delete('search');
            p.delete('page');
        });
    }, [
        updateParams
    ]);
    return {
        pagination,
        sorting,
        columnFilters,
        search,
        onPaginationChange,
        onSortingChange,
        onColumnFiltersChange,
        onSearchChange
    };
}

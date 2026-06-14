'use client';
/* URL state for the where-builder filter bar. Mirrors useDataTableUrlState's
   plumbing (useSearchParams + router.replace, no history pollution) but reads
   and writes the whole `where[...]` namespace via filterCodec.

   The per-column `contains` input owned by useDataTableUrlState writes to the
   same URL keys; this hook reads them and surfaces them as chips, so both
   inputs stay in sync via the URL.

   Pending chips: a chip the user just added but hasn't entered a value for
   yet doesn't write to the URL (Payload's Where validator would either ignore
   the empty operator or error on it). Such chips live in local React state
   until they acquire a value, then promote to the URL. The merged state
   exposes URL-derived chips followed by any pending chips, with pending
   chips deduplicated against URL chips that share their (field, operator). */ import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { parseWhere } from './parseWhere.js';
import { applyStateToSearchParams, countChipsForFieldOp, formatChipId, makeGroupId, whereToState } from './filterCodec.js';
const chipHasMaterialValue = (chip)=>{
    if (chip.operator === 'exists') return chip.value !== null;
    if (chip.operator === 'in' || chip.operator === 'not_in') {
        return Array.isArray(chip.value) && chip.value.length > 0;
    }
    if (typeof chip.value === 'boolean') return true;
    return chip.value !== null && chip.value !== undefined && chip.value !== '';
};
const collectChips = (state)=>{
    const out = [];
    for (const node of state.nodes){
        if (node.kind === 'chip') out.push(node.chip);
        else for (const c of node.group.chips)out.push(c);
    }
    return out;
};
const findChip = (state, id)=>{
    for(let i = 0; i < state.nodes.length; i += 1){
        const node = state.nodes[i];
        if (node.kind === 'chip' && node.chip.id === id) {
            return {
                nodeIndex: i,
                groupChipIndex: null,
                chip: node.chip
            };
        }
        if (node.kind === 'group') {
            for(let j = 0; j < node.group.chips.length; j += 1){
                if (node.group.chips[j].id === id) {
                    return {
                        nodeIndex: i,
                        groupChipIndex: j,
                        chip: node.group.chips[j]
                    };
                }
            }
        }
    }
    return null;
};
const mapChip = (state, id, fn)=>({
        nodes: state.nodes.map((node)=>{
            if (node.kind === 'chip') {
                if (node.chip.id !== id) return node;
                return {
                    kind: 'chip',
                    chip: fn(node.chip)
                };
            }
            const idx = node.group.chips.findIndex((c)=>c.id === id);
            if (idx === -1) return node;
            const nextChips = node.group.chips.map((c, i)=>i === idx ? fn(c) : c);
            return {
                kind: 'group',
                group: {
                    ...node.group,
                    chips: nextChips
                }
            };
        })
    });
const dropChip = (state, id)=>{
    const nextNodes = [];
    for (const node of state.nodes){
        if (node.kind === 'chip') {
            if (node.chip.id === id) continue;
            nextNodes.push(node);
            continue;
        }
        const chips = node.group.chips.filter((c)=>c.id !== id);
        if (chips.length === 0) continue;
        if (chips.length === 1) {
            nextNodes.push({
                kind: 'chip',
                chip: chips[0]
            });
        } else {
            nextNodes.push({
                kind: 'group',
                group: {
                    ...node.group,
                    chips
                }
            });
        }
    }
    return {
        nodes: nextNodes
    };
};
const normalize = (state)=>{
    // Collapse single-chip OR groups back to flat chips
    const nodes = [];
    for (const node of state.nodes){
        if (node.kind === 'group' && node.group.chips.length === 1) {
            nodes.push({
                kind: 'chip',
                chip: node.group.chips[0]
            });
        } else {
            nodes.push(node);
        }
    }
    return {
        nodes
    };
};
export function useFilterUrlState() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const urlState = React.useMemo(()=>{
        const sp = {};
        searchParams.forEach((value, key)=>{
            const existing = sp[key];
            if (existing === undefined) {
                sp[key] = value;
            } else if (Array.isArray(existing)) {
                existing.push(value);
            } else {
                sp[key] = [
                    existing,
                    value
                ];
            }
        });
        const where = parseWhere(sp);
        return whereToState(where);
    }, [
        searchParams
    ]);
    const [pendingChips, setPendingChips] = React.useState([]);
    const interactedRef = React.useRef(false);
    const markInteracted = React.useCallback(()=>{
        interactedRef.current = true;
    }, []);
    // Prune pending chips that have since landed in the URL.
    React.useEffect(()=>{
        setPendingChips((prev)=>{
            if (prev.length === 0) return prev;
            const present = new Set();
            for (const node of urlState.nodes){
                if (node.kind === 'chip') {
                    present.add(`${node.chip.field}|${node.chip.operator}`);
                } else {
                    for (const c of node.group.chips){
                        present.add(`${c.field}|${c.operator}`);
                    }
                }
            }
            const filtered = prev.filter((p)=>!present.has(`${p.field}|${p.operator}`));
            return filtered.length === prev.length ? prev : filtered;
        });
    }, [
        urlState
    ]);
    const state = React.useMemo(()=>{
        if (pendingChips.length === 0) return urlState;
        // Dedupe both against URL chips and amongst pending chips: only the first
        // chip per (field, operator) is visible. Two pending chips with the same
        // (field, op) would collide on the URL write in flat mode anyway.
        const seenFieldOps = new Set();
        for (const node of urlState.nodes){
            if (node.kind === 'chip') {
                seenFieldOps.add(`${node.chip.field}|${node.chip.operator}`);
            } else {
                for (const c of node.group.chips){
                    seenFieldOps.add(`${c.field}|${c.operator}`);
                }
            }
        }
        const visiblePending = [];
        for (const p of pendingChips){
            const key = `${p.field}|${p.operator}`;
            if (seenFieldOps.has(key)) continue;
            seenFieldOps.add(key);
            visiblePending.push(p);
        }
        if (visiblePending.length === 0) return urlState;
        return {
            nodes: [
                ...urlState.nodes,
                ...visiblePending.map((chip)=>({
                        kind: 'chip',
                        chip
                    }))
            ]
        };
    }, [
        urlState,
        pendingChips
    ]);
    /* Anticipate the URL chip ID a pending chip will receive once promoted, so
     the pending and URL chips share a React key and React preserves the DOM
     (Input focus, popover state) across promotion. The count matches what
     whereToState's idGen will assign post-promotion: existing URL chips with
     this (field, op) + already-anticipated pending chips + this one. */ const anticipateChipId = React.useCallback((field, operator, excludePendingId = null)=>{
        const urlN = countChipsForFieldOp(urlState, field, operator);
        let pendingN = 0;
        for (const p of pendingChips){
            if (p.id === excludePendingId) continue;
            if (p.field === field && p.operator === operator) pendingN += 1;
        }
        return formatChipId(field, operator, urlN + pendingN + 1);
    }, [
        urlState,
        pendingChips
    ]);
    const writeUrlState = React.useCallback((next)=>{
        const normalized = normalize(next);
        const params = new URLSearchParams(searchParams.toString());
        applyStateToSearchParams(params, normalized);
        params.delete('page');
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, {
            scroll: false
        });
    }, [
        router,
        pathname,
        searchParams
    ]);
    const addChip = React.useCallback((chip)=>{
        markInteracted();
        const id = anticipateChipId(chip.field, chip.operator);
        const fullChip = {
            ...chip,
            id
        };
        if (chipHasMaterialValue(fullChip)) {
            writeUrlState({
                nodes: [
                    ...urlState.nodes,
                    {
                        kind: 'chip',
                        chip: fullChip
                    }
                ]
            });
        } else {
            setPendingChips((prev)=>[
                    ...prev,
                    fullChip
                ]);
        }
        return id;
    }, [
        urlState,
        writeUrlState,
        anticipateChipId,
        markInteracted
    ]);
    const updateChip = React.useCallback((id, patch)=>{
        markInteracted();
        const pendingIdx = pendingChips.findIndex((c)=>c.id === id);
        if (pendingIdx !== -1) {
            const current = pendingChips[pendingIdx];
            const merged = {
                ...current,
                ...patch,
                id: current.id
            };
            const fieldOrOpChanged = patch.field !== undefined && patch.field !== current.field || patch.operator !== undefined && patch.operator !== current.operator;
            if (fieldOrOpChanged) {
                merged.id = anticipateChipId(merged.field, merged.operator, current.id);
            }
            // Update the pending chip in place. The prune effect removes it once
            // the URL re-decode lands — we DON'T remove it synchronously here,
            // because that would unmount the chip during the brief window between
            // `router.replace` and Next's searchParams update, dropping focus and
            // (in Next dev mode where the route transition can take 100s of ms)
            // making the chip disappear visibly.
            setPendingChips((prev)=>prev.map((c)=>c.id === id ? merged : c));
            if (chipHasMaterialValue(merged)) {
                // Replace any existing URL chip with the same (field, operator) —
                // flat URL mode can't represent two chips with the same key. Without
                // this, fast keystrokes during the pending → URL transit would emit
                // duplicate `where[field][op]=` entries, and Next would collapse
                // them to an array (parseWhere takes only the first value).
                writeUrlState({
                    nodes: [
                        ...urlState.nodes.filter((n)=>!(n.kind === 'chip' && n.chip.field === merged.field && n.chip.operator === merged.operator)),
                        {
                            kind: 'chip',
                            chip: merged
                        }
                    ]
                });
            }
            return;
        }
        const next = mapChip(state, id, (c)=>({
                ...c,
                ...patch
            }));
        writeUrlState(next);
    }, [
        pendingChips,
        urlState,
        state,
        writeUrlState,
        anticipateChipId,
        markInteracted
    ]);
    const removeChip = React.useCallback((id)=>{
        markInteracted();
        if (pendingChips.some((c)=>c.id === id)) {
            setPendingChips((prev)=>prev.filter((c)=>c.id !== id));
            return;
        }
        writeUrlState(dropChip(state, id));
    }, [
        pendingChips,
        state,
        writeUrlState,
        markInteracted
    ]);
    const moveChip = React.useCallback((id, direction)=>{
        markInteracted();
        if (pendingChips.some((c)=>c.id === id)) return;
        const found = findChip(urlState, id);
        if (!found) return;
        if (found.groupChipIndex !== null) return;
        const i = found.nodeIndex;
        const j = i + direction;
        if (j < 0 || j >= urlState.nodes.length) return;
        const nodes = [
            ...urlState.nodes
        ];
        [nodes[i], nodes[j]] = [
            nodes[j],
            nodes[i]
        ];
        writeUrlState({
            nodes
        });
    }, [
        pendingChips,
        urlState,
        writeUrlState,
        markInteracted
    ]);
    const toggleOrJoin = React.useCallback((id)=>{
        markInteracted();
        if (pendingChips.some((c)=>c.id === id)) return;
        const found = findChip(urlState, id);
        if (!found) return;
        const i = found.nodeIndex;
        if (found.groupChipIndex !== null) {
            const node = urlState.nodes[i];
            if (node.kind !== 'group') return;
            const chips = [
                ...node.group.chips
            ];
            const [chip] = chips.splice(found.groupChipIndex, 1);
            const nodes = [
                ...urlState.nodes
            ];
            if (chips.length === 0) {
                nodes.splice(i, 1);
            } else if (chips.length === 1) {
                nodes[i] = {
                    kind: 'chip',
                    chip: chips[0]
                };
            } else {
                nodes[i] = {
                    kind: 'group',
                    group: {
                        ...node.group,
                        chips
                    }
                };
            }
            const insertAt = chips.length === 0 ? i : i + 1;
            nodes.splice(insertAt, 0, {
                kind: 'chip',
                chip
            });
            writeUrlState({
                nodes
            });
            return;
        }
        if (i === 0) return;
        const prev = urlState.nodes[i - 1];
        const node = urlState.nodes[i];
        if (node.kind !== 'chip') return;
        const nodes = [
            ...urlState.nodes
        ];
        if (prev.kind === 'group') {
            nodes[i - 1] = {
                kind: 'group',
                group: {
                    ...prev.group,
                    chips: [
                        ...prev.group.chips,
                        node.chip
                    ]
                }
            };
            nodes.splice(i, 1);
        } else {
            nodes.splice(i - 1, 2, {
                kind: 'group',
                group: {
                    id: makeGroupId(),
                    op: 'or',
                    chips: [
                        prev.chip,
                        node.chip
                    ]
                }
            });
        }
        writeUrlState({
            nodes
        });
    }, [
        pendingChips,
        urlState,
        writeUrlState,
        markInteracted
    ]);
    const clearAll = React.useCallback(()=>{
        markInteracted();
        setPendingChips([]);
        writeUrlState({
            nodes: []
        });
    }, [
        writeUrlState,
        markInteracted
    ]);
    // replaceState is used by usePreferencesSync to hydrate from server —
    // do NOT mark interacted, otherwise the very act of hydration would block
    // future hydrations on the same page.
    const replaceState = React.useCallback((next)=>{
        setPendingChips([]);
        writeUrlState(next);
    }, [
        writeUrlState
    ]);
    const hasAnyFilter = urlState.nodes.length > 0 || pendingChips.length > 0;
    return {
        state,
        hasAnyFilter,
        addChip,
        updateChip,
        removeChip,
        moveChip,
        toggleOrJoin,
        clearAll,
        replaceState,
        interactedRef
    };
}

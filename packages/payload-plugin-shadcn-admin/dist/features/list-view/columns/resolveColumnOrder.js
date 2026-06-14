/* Merge the auto column ids produced by buildColumnsForCollection with a
   persisted user-defined order.

   Locked-first ids (e.g. 'select' when bulk-delete is on) stay at index 0 and
   never appear in the persisted `order` array. Anything in `persistedOrder`
   that no longer exists in `autoIds` is silently dropped. New ids in
   `autoIds` that the persisted order has never seen are appended at the end,
   preserving their relative order from `autoIds`. */ export function resolveColumnOrder(autoIds, persistedOrder, lockedFirstIds = new Set()) {
    const locked = autoIds.filter((id)=>lockedFirstIds.has(id));
    const orderable = autoIds.filter((id)=>!lockedFirstIds.has(id));
    if (!persistedOrder || persistedOrder.length === 0) {
        return [
            ...locked,
            ...orderable
        ];
    }
    const orderableSet = new Set(orderable);
    const seen = new Set();
    const result = [];
    for (const id of persistedOrder){
        if (!orderableSet.has(id) || seen.has(id)) continue;
        result.push(id);
        seen.add(id);
    }
    for (const id of orderable){
        if (!seen.has(id)) result.push(id);
    }
    return [
        ...locked,
        ...result
    ];
}

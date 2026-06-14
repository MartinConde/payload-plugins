/* Array-level beforeChange on `views`: for every row, clear the side of the
   print-area config that the active `printAreaSource` doesn't use. Without this
   a user who fills custom dims, then switches to a template, would leave the
   stale widthMm/heightMm/bleedMm on the doc — they'd be invisible in the admin
   (conditional fields hide them) but still rideable through the REST API and
   would re-appear if the user toggled back.

   Tolerates non-array `value` (Payload may hand us `undefined` on partial
   writes); only mutates rows that look like objects. Returns a new array; no
   in-place mutation of the input. */ export const normalizeView = ({ value })=>{
    if (!Array.isArray(value)) return value;
    return value.map((row)=>{
        if (!row || typeof row !== 'object') return row;
        const r = row;
        if (r.printAreaSource === 'custom') {
            return {
                ...r,
                printAreaTemplate: null
            };
        }
        if (r.printAreaSource === 'template') {
            return {
                ...r,
                widthMm: null,
                heightMm: null,
                bleedMm: null
            };
        }
        return r;
    });
};

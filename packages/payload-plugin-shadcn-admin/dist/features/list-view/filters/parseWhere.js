/* Parse Next.js-flat searchParams (e.g. { 'where[title][equals]': 'foo' })
   into the nested object shape Payload's Local API expects for `where`.

   Single chips:        where[alt][contains]=foo
   Array operators:     where[id][in][]=a, where[id][in][]=b
   AND/OR groups:       where[and][0][alt][contains]=foo
                        where[and][1][or][0][status][equals]=draft

   Payload's Where validator requires `and`/`or` to be arrays. The regex walker
   produces objects with numeric-string keys (`{and: {'0': ..., '1': ...}}`);
   we post-walk the tree converting any branch whose keys are exclusively
   non-negative integers into an ordered array. The flat single-chip case has
   no numeric keys so it's unaffected. */ const isPlainObject = (v)=>typeof v === 'object' && v !== null && !Array.isArray(v);
const NUMERIC_KEY_RE = /^(0|[1-9]\d*)$/;
const convertNumericBranches = (node)=>{
    if (Array.isArray(node)) return node.map(convertNumericBranches);
    if (!isPlainObject(node)) return node;
    const keys = Object.keys(node);
    const allNumeric = keys.length > 0 && keys.every((k)=>NUMERIC_KEY_RE.test(k));
    if (allNumeric) {
        const sorted = keys.map((k)=>Number(k)).sort((a, b)=>a - b);
        return sorted.map((i)=>convertNumericBranches(node[String(i)]));
    }
    const out = {};
    for (const k of keys)out[k] = convertNumericBranches(node[k]);
    return out;
};
export function parseWhere(searchParams) {
    if (!searchParams) return undefined;
    const out = {};
    let touched = false;
    for (const [key, value] of Object.entries(searchParams)){
        if (value === undefined) continue;
        if (!key.startsWith('where[') && key !== 'where') continue;
        touched = true;
        const path = [];
        const re = /\[([^\]]*)\]/g;
        let m;
        while((m = re.exec(key)) !== null)path.push(m[1]);
        if (path.length === 0) continue;
        // Trailing empty segment denotes "array element" (where[id][in][]).
        // Push current value into an array at the parent path.
        const isTrailingArrayPush = path.length > 0 && path[path.length - 1] === '';
        const walkPath = isTrailingArrayPush ? path.slice(0, -1) : path;
        let node = out;
        for(let i = 0; i < walkPath.length - 1; i += 1){
            const seg = walkPath[i];
            if (typeof node[seg] !== 'object' || node[seg] === null) node[seg] = {};
            node = node[seg];
        }
        const last = walkPath[walkPath.length - 1];
        if (isTrailingArrayPush) {
            if (!Array.isArray(node[last])) node[last] = [];
            const vals = Array.isArray(value) ? value : [
                value
            ];
            for (const v of vals)node[last].push(v);
        } else {
            node[last] = value;
        }
    }
    if (!touched) return undefined;
    return convertNumericBranches(out);
}

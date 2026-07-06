/* Pure, non-React formatting helpers for auto-generated list-view cells: date/
   number/option/point formatting, related-doc title resolution, richText/
   array/blocks/group summarizing, and field-label derivation. Split out of
   autoColumns.tsx, which owns the React cell-rendering switch and column
   builder that call these. */ export const EM_DASH = '—';
export const stringifyLabel = (value)=>{
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
        for (const v of Object.values(value)){
            if (typeof v === 'string') return v;
        }
    }
    return null;
};
export const titleCase = (name)=>name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
export const labelFor = (field, fallback)=>stringifyLabel(field.label) ?? titleCase(field.name ?? fallback);
export const truncate = (s, n)=>s.length > n ? s.slice(0, n - 1) + '…' : s;
export const isEmpty = (v)=>v === null || v === undefined || v === '';
export const formatDate = (value, displayFormat)=>{
    if (isEmpty(value)) return EM_DASH;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return EM_DASH;
    // displayFormat is a date-fns token string; we don't ship date-fns, so we
    // ignore the token and use the locale-aware short format as documented.
    // Consumers who need full format control should ship their own list view.
    void displayFormat;
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};
export const formatNumber = (value)=>{
    if (isEmpty(value)) return EM_DASH;
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return new Intl.NumberFormat().format(n);
};
export const optionLabel = (options, value)=>{
    if (isEmpty(value)) return EM_DASH;
    if (!options) return String(value);
    for (const opt of options){
        if (typeof opt === 'string') {
            if (opt === value) return opt;
        } else if (opt.value === value) {
            return stringifyLabel(opt.label) ?? String(opt.value);
        }
    }
    return String(value);
};
export const relatedTitle = (related, useAsTitle)=>{
    if (isEmpty(related)) return EM_DASH;
    if (typeof related !== 'object') return String(related);
    const obj = related;
    if (useAsTitle && !isEmpty(obj[useAsTitle])) return String(obj[useAsTitle]);
    if (!isEmpty(obj.id)) return String(obj.id);
    return EM_DASH;
};
/* Walk a Lexical AST (`{ root: { children: [...] } }`) or a Slate-style
   array of nodes, collecting text. Defensive against arbitrary shapes. */ export const extractLexicalText = (value, maxChars)=>{
    const parts = [];
    let budget = maxChars * 4 // bail early on huge docs
    ;
    const visit = (node)=>{
        if (budget <= 0) return;
        if (node == null) return;
        if (typeof node === 'string') {
            parts.push(node);
            budget -= node.length;
            return;
        }
        if (Array.isArray(node)) {
            for (const child of node){
                if (budget <= 0) break;
                visit(child);
            }
            return;
        }
        if (typeof node !== 'object') return;
        const obj = node;
        if (typeof obj.text === 'string') {
            parts.push(obj.text);
            budget -= obj.text.length;
        }
        if (obj.children) visit(obj.children);
        if (obj.root) visit(obj.root);
    };
    try {
        visit(value);
    } catch  {
        return '';
    }
    const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
    return truncate(joined, maxChars);
};
export const summarizeArray = (value, field)=>{
    if (!Array.isArray(value)) return EM_DASH;
    const n = value.length;
    const singular = stringifyLabel(field.labels?.singular) ?? 'item';
    const plural = stringifyLabel(field.labels?.plural) ?? 'items';
    return `${n} ${n === 1 ? singular : plural}`;
};
export const summarizeBlocks = (value)=>{
    if (!Array.isArray(value)) return EM_DASH;
    const n = value.length;
    const seen = new Set();
    const slugs = [];
    for (const item of value){
        if (item && typeof item === 'object') {
            const slug = item.blockType;
            if (typeof slug === 'string' && !seen.has(slug)) {
                seen.add(slug);
                slugs.push(slug);
            }
        }
    }
    if (slugs.length === 0) return `${n} blocks`;
    return `${n} blocks (${truncate(slugs.join(', '), 40)})`;
};
const SCALAR_PREFERRED_KEYS = [
    'title',
    'name',
    'label'
];
const isScalar = (v)=>typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
export const summarizeGroup = (value)=>{
    if (value == null || typeof value !== 'object' || Array.isArray(value)) return EM_DASH;
    const obj = value;
    for (const key of SCALAR_PREFERRED_KEYS){
        const v = obj[key];
        if (isScalar(v) && !isEmpty(v)) return String(v);
    }
    for (const v of Object.values(obj)){
        if (isScalar(v) && !isEmpty(v)) return String(v);
    }
    return EM_DASH;
};
export const formatPoint = (value)=>{
    if (!Array.isArray(value) || value.length !== 2) return EM_DASH;
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return EM_DASH;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

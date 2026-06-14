/* Flatten a collection's field tree into the list of fields the bulk-edit
   picker can offer. Structural containers (row/collapsible/group/tabs) are
   transparent — we recurse into them and offer their inner leaves, each at its
   full dotted path so the PATCH body can nest them (e.g. `myGroup.subfield`).
   array / blocks / richText are offered as a single whole-value entry (no
   recursion). Everything the doc form supports is offered; the only skips are
   the doc-form renderability rules plus the `admin.disableBulkEdit` opt-out. */ import { isFieldRenderable, labelOf } from '../../doc-form/fieldTree/sharedHelpers.js';
const tabLabelOf = (tab, idx)=>{
    if (tab.label && tab.label.length > 0) return tab.label;
    if (tab.name && tab.name.length > 0) return tab.name;
    return `Tab ${idx + 1}`;
};
const crumb = (parent, child)=>parent ? `${parent} › ${child}` : child;
const isPickableLeaf = (field)=>{
    if (!field.name) return false;
    if (field.admin?.disableBulkEdit) return false;
    return isFieldRenderable(field);
};
/* Walk one level. `pathPrefix` already includes a trailing dot when non-empty
   (e.g. `myGroup.`). `labelPrefix` is the breadcrumb accumulated from enclosing
   named containers. */ const walk = (fields, pathPrefix, labelPrefix, out)=>{
    for (const field of fields){
        if (field.type === 'row' || field.type === 'collapsible') {
            // Transparent: same path prefix, breadcrumb unchanged (these have no
            // data path of their own).
            walk(field.fields ?? [], pathPrefix, labelPrefix, out);
            continue;
        }
        if (field.type === 'group') {
            if (!field.name) continue;
            walk(field.fields ?? [], `${pathPrefix}${field.name}.`, crumb(labelPrefix, labelOf(field)), out);
            continue;
        }
        if (field.type === 'tabs') {
            ;
            (field.tabs ?? []).forEach((tab, idx)=>{
                const tabPrefix = tab.name ? `${pathPrefix}${tab.name}.` : pathPrefix;
                walk(tab.fields, tabPrefix, crumb(labelPrefix, tabLabelOf(tab, idx)), out);
            });
            continue;
        }
        // Leaf (incl. array / blocks / richText — offered as whole-value entries).
        if (!isPickableLeaf(field)) continue;
        out.push({
            path: `${pathPrefix}${field.name}`,
            pathPrefix,
            field,
            label: crumb(labelPrefix, labelOf(field)),
            type: field.type
        });
    }
};
export const collectBulkEditableLeaves = (fields)=>{
    const out = [];
    walk(fields, '', '', out);
    return out;
};

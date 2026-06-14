'use client';
/* Read-only view of the doc form's current value tree, threaded to deeply-
   nested inputs so a `.input` override can read SIBLING fields (e.g. the
   products print-area editor reads the sibling `mockup` upload's value to load
   the canvas background). Mirrors DocIdentityContext / LocaleContext.

   `values` is the doc-root tree the bridge owns. Localized leaves hold
   `{ locale: value }` objects; non-localized leaves hold the plain value (an
   upload field's value is the related doc ID). `activeLocale` is null when
   localization is off. Both are empty/null outside a doc form (e.g. list-view
   filters), where no doc form exists. */ import * as React from 'react';
// Inlined from the bridge's path helpers so this context has zero internal
// dependencies on the admin plugin — keeps the surface installable in a
// vanilla Payload project without payload-plugin-shadcn-admin.
const isObject = (v)=>typeof v === 'object' && v !== null && !Array.isArray(v);
const parsePathSegments = (path)=>path.split('.').filter((s)=>s.length > 0).map((seg)=>{
        const n = Number(seg);
        return Number.isInteger(n) && String(n) === seg ? n : seg;
    });
const getByPath = (root, path)=>{
    const segs = parsePathSegments(path);
    let cur = root;
    for (const seg of segs){
        if (cur === null || cur === undefined) return undefined;
        if (typeof seg === 'number') {
            if (!Array.isArray(cur)) return undefined;
            cur = cur[seg];
        } else {
            if (!isObject(cur)) return undefined;
            cur = cur[seg];
        }
    }
    return cur;
};
const NOOP_SET = (_path, _next)=>{};
const DocFormValuesContext = /*#__PURE__*/ React.createContext({
    values: {},
    activeLocale: null,
    setValueAtPath: NOOP_SET
});
export const DocFormValuesProvider = DocFormValuesContext.Provider;
/** The full doc-root value tree + active locale. See the note above on leaf
 *  shapes. Prefer `useDocFormFieldValue` for reading a single field. */ export const useDocFormValues = ()=>React.useContext(DocFormValuesContext);
/** Read one field's value by dotted path, projecting a localized leaf
 *  (`{ locale: value }`) to the active locale's slice. Returns `undefined`
 *  outside a doc form or when the path is absent. */ export const useDocFormFieldValue = (path)=>{
    const { values, activeLocale } = React.useContext(DocFormValuesContext);
    const raw = getByPath(values, path);
    if (activeLocale && isObject(raw) && activeLocale in raw) {
        return raw[activeLocale];
    }
    return raw;
};
/** Stable write callback for the doc form. `.input` overrides on a `ui` (or
 *  any) field can use this to drive sibling/descendant paths — the same
 *  channel each FieldInput's `onChange` goes through. Outside the bridge,
 *  returns a no-op so consumer code stays safe. */ export const useDocFormSetValue = ()=>{
    return React.useContext(DocFormValuesContext).setValueAtPath;
};

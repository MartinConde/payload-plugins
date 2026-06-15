import * as React from 'react';
type DocFormValuesContextValue = {
    values: Record<string, unknown>;
    activeLocale: string | null;
    /** Bridge's write callback. Mirrors the `onChange` each FieldInput receives
     *  but lets a `.input` override write to ANY path — used by overrides that
     *  drive sibling fields (e.g. the products Designer writes per-view
     *  placement/transform from a single top-level ui field). Falls back to a
     *  no-op outside the bridge so consumers don't have to null-check. */
    setValueAtPath: (path: string, next: unknown) => void;
};
export declare const DocFormValuesProvider: React.Provider<DocFormValuesContextValue>;
/** The full doc-root value tree + active locale. See the note above on leaf
 *  shapes. Prefer `useDocFormFieldValue` for reading a single field. */
export declare const useDocFormValues: () => DocFormValuesContextValue;
/** Read one field's value by dotted path, projecting a localized leaf
 *  (`{ locale: value }`) to the active locale's slice. Returns `undefined`
 *  outside a doc form or when the path is absent.
 *
 *  When `activeLocale` is null (single-locale sites where localizationEnabled
 *  is false) we still defensively unwrap a locale-keyed object by falling back
 *  to its first key — prevents `.input` overrides from receiving a raw
 *  `{ de: '…' }` object if the RSC ever produces locale-keyed initialValues. */
export declare const useDocFormFieldValue: (path: string) => unknown;
/** Stable write callback for the doc form. `.input` overrides on a `ui` (or
 *  any) field can use this to drive sibling/descendant paths — the same
 *  channel each FieldInput's `onChange` goes through. Outside the bridge,
 *  returns a no-op so consumer code stays safe. */
export declare const useDocFormSetValue: () => ((path: string, next: unknown) => void);
export {};

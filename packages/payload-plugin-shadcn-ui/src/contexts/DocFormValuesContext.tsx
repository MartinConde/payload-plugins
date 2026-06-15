'use client'

/* Read-only view of the doc form's current value tree, threaded to deeply-
   nested inputs so a `.input` override can read SIBLING fields (e.g. the
   products print-area editor reads the sibling `mockup` upload's value to load
   the canvas background). Mirrors DocIdentityContext / LocaleContext.

   `values` is the doc-root tree the bridge owns. Localized leaves hold
   `{ locale: value }` objects; non-localized leaves hold the plain value (an
   upload field's value is the related doc ID). `activeLocale` is null when
   localization is off. Both are empty/null outside a doc form (e.g. list-view
   filters), where no doc form exists. */

import * as React from 'react'

// Inlined from the bridge's path helpers so this context has zero internal
// dependencies on the admin plugin — keeps the surface installable in a
// vanilla Payload project without payload-plugin-shadcn-admin.
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const parsePathSegments = (path: string): (string | number)[] =>
  path
    .split('.')
    .filter((s) => s.length > 0)
    .map((seg) => {
      const n = Number(seg)
      return Number.isInteger(n) && String(n) === seg ? n : seg
    })

const getByPath = (root: unknown, path: string): unknown => {
  const segs = parsePathSegments(path)
  let cur: unknown = root
  for (const seg of segs) {
    if (cur === null || cur === undefined) return undefined
    if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return undefined
      cur = (cur as unknown[])[seg]
    } else {
      if (!isObject(cur)) return undefined
      cur = cur[seg]
    }
  }
  return cur
}

type DocFormValuesContextValue = {
  values: Record<string, unknown>
  activeLocale: string | null
  /** Bridge's write callback. Mirrors the `onChange` each FieldInput receives
   *  but lets a `.input` override write to ANY path — used by overrides that
   *  drive sibling fields (e.g. the products Designer writes per-view
   *  placement/transform from a single top-level ui field). Falls back to a
   *  no-op outside the bridge so consumers don't have to null-check. */
  setValueAtPath: (path: string, next: unknown) => void
}

const NOOP_SET = (_path: string, _next: unknown): void => {}

const DocFormValuesContext = React.createContext<DocFormValuesContextValue>({
  values: {},
  activeLocale: null,
  setValueAtPath: NOOP_SET,
})

export const DocFormValuesProvider = DocFormValuesContext.Provider

/** The full doc-root value tree + active locale. See the note above on leaf
 *  shapes. Prefer `useDocFormFieldValue` for reading a single field. */
export const useDocFormValues = (): DocFormValuesContextValue =>
  React.useContext(DocFormValuesContext)

/** Read one field's value by dotted path, projecting a localized leaf
 *  (`{ locale: value }`) to the active locale's slice. Returns `undefined`
 *  outside a doc form or when the path is absent.
 *
 *  When `activeLocale` is null (single-locale sites where localizationEnabled
 *  is false) we still defensively unwrap a locale-keyed object by falling back
 *  to its first key — prevents `.input` overrides from receiving a raw
 *  `{ de: '…' }` object if the RSC ever produces locale-keyed initialValues. */
export const useDocFormFieldValue = (path: string): unknown => {
  const { values, activeLocale } = React.useContext(DocFormValuesContext)
  const raw = getByPath(values, path)
  if (isObject(raw)) {
    const key = activeLocale ?? Object.keys(raw as Record<string, unknown>)[0]
    if (key && key in (raw as Record<string, unknown>)) {
      return (raw as Record<string, unknown>)[key]
    }
  }
  return raw
}

/** Stable write callback for the doc form. `.input` overrides on a `ui` (or
 *  any) field can use this to drive sibling/descendant paths — the same
 *  channel each FieldInput's `onChange` goes through. Outside the bridge,
 *  returns a no-op so consumer code stays safe. */
export const useDocFormSetValue = (): ((path: string, next: unknown) => void) => {
  return React.useContext(DocFormValuesContext).setValueAtPath
}

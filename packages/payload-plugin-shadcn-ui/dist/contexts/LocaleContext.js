'use client';
/* v3.8 — locale context for the auto doc form.
   Threads the bridge's `activeLocale` to deeply-nested `FieldInput`
   instances without adding a prop at every call site, mirroring how
   v3.7 read `docPermissions` via `useDocumentInfo()`. */ import * as React from 'react';
const LocaleContext = /*#__PURE__*/ React.createContext({
    activeLocale: null
});
export const LocaleProvider = LocaleContext.Provider;
export const useActiveLocale = ()=>React.useContext(LocaleContext).activeLocale;

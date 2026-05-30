'use client'

/* v3.8 — locale context for the auto doc form.
   Threads the bridge's `activeLocale` to deeply-nested `FieldInput`
   instances without adding a prop at every call site, mirroring how
   v3.7 read `docPermissions` via `useDocumentInfo()`. */

import * as React from 'react'

type LocaleContextValue = {
  /** Active locale code. `null` when localization is not configured for the
   *  current doc — consumers should treat fields as non-localized in that
   *  case. */
  activeLocale: string | null
}

const LocaleContext = React.createContext<LocaleContextValue>({
  activeLocale: null,
})

export const LocaleProvider = LocaleContext.Provider

export const useActiveLocale = (): string | null =>
  React.useContext(LocaleContext).activeLocale

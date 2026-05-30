'use client'

/* Identity of the document currently being edited, threaded to deeply-nested
   inputs (e.g. RelationshipPicker) without a prop at every call site — mirrors
   LocaleContext. Used to exclude the current doc from self-referential
   relationship pickers (you can't pick a page as its own parent). Both values
   are `null` outside the doc form (e.g. list-view filters), where no exclusion
   applies. */

import * as React from 'react'

type DocIdentityValue = {
  /** Slug of the collection being edited. `null` outside a doc form. */
  collectionSlug: string | null
  /** ID of the document being edited. `null` on the create form or outside a
   *  doc form. */
  documentId: string | number | null
}

const DocIdentityContext = React.createContext<DocIdentityValue>({
  collectionSlug: null,
  documentId: null,
})

export const DocIdentityProvider = DocIdentityContext.Provider

export const useDocIdentity = (): DocIdentityValue =>
  React.useContext(DocIdentityContext)

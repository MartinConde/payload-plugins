'use client';
/* Identity of the document currently being edited, threaded to deeply-nested
   inputs (e.g. RelationshipPicker) without a prop at every call site — mirrors
   LocaleContext. Used to exclude the current doc from self-referential
   relationship pickers (you can't pick a page as its own parent). Both values
   are `null` outside the doc form (e.g. list-view filters), where no exclusion
   applies. */ import * as React from 'react';
const DocIdentityContext = /*#__PURE__*/ React.createContext({
    collectionSlug: null,
    documentId: null
});
export const DocIdentityProvider = DocIdentityContext.Provider;
export const useDocIdentity = ()=>React.useContext(DocIdentityContext);

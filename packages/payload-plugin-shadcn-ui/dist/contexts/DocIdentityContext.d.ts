import * as React from 'react';
type DocIdentityValue = {
    /** Slug of the collection being edited. `null` outside a doc form. */
    collectionSlug: string | null;
    /** ID of the document being edited. `null` on the create form or outside a
     *  doc form. */
    documentId: string | number | null;
};
export declare const DocIdentityProvider: React.Provider<DocIdentityValue>;
export declare const useDocIdentity: () => DocIdentityValue;
export {};

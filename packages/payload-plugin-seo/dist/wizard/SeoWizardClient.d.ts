import * as React from 'react';
import { type ExtractedCollection } from 'payload-plugin-shadcn-ui';
import { type CollectionHealth } from './audit.js';
type Props = {
    settingsSlug: string;
    mediaSlug: string;
    initialData: Record<string, unknown>;
    collections: CollectionHealth[];
    collectionSlugs: string[];
    /** Default locale the wizard reads/writes/audits against (null = no
     *  localization). Pinning all three to one locale keeps the health panel in
     *  sync with the values being edited. */
    defaultLocale: string | null;
    /** `useAsTitle` per collection slug — lets the reused `UploadFieldInput`'s
     *  picker do a title search. */
    useAsTitleBySlug: Record<string, string | undefined>;
    /** Serialized upload-collection metadata for the reused `UploadFieldInput`'s
     *  "Upload new" dialog. */
    uploadCollectionsBySlug: Record<string, ExtractedCollection>;
};
export declare function SeoWizardClient({ settingsSlug, mediaSlug, initialData, collections, collectionSlugs, defaultLocale, useAsTitleBySlug, uploadCollectionsBySlug, }: Props): React.ReactElement;
export {};

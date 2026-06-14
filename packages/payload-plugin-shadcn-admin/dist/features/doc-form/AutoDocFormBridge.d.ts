import * as React from 'react';
import type { UploadEdits } from '../../internal/payloadAdapter.js';
import { type ExtractedLocale } from './localization/LocaleSwitcher.js';
import type { DropzoneExisting } from './inputs/DropzoneInput.js';
import type { ExtractedCollection } from 'payload-plugin-shadcn-ui';
import { type RichTextRenderedMap } from './richtext/extractRichTextRenderedFields.js';
type Mode = 'create' | 'edit';
export type AutoDocFormBridgeProps = {
    mode: Mode;
    /** Set for collection docs. Mutually exclusive with `globalSlug`. */
    collectionSlug?: string;
    /** Set for global (singleton) docs. When present the bridge upserts via
     *  `POST /api/globals/{slug}` (never PATCH, no id, no create-mode nav) and
     *  the doc form runs in permanent edit mode. Mutually exclusive with
     *  `collectionSlug` / `docId`. */
    globalSlug?: string;
    docId?: string | number;
    collection: ExtractedCollection;
    useAsTitleBySlug: Record<string, string | undefined>;
    /** Serializable metadata for every upload collection, keyed by slug. Threaded
     *  to UploadFieldInput and CollectionUploadHeader so the custom UploadNewDialog
     *  can render each target collection's fields. */
    uploadCollectionsBySlug?: Record<string, ExtractedCollection>;
    initialValues: Record<string, unknown>;
    /** Pre-rendered Payload richText Field elements, lifted from
     *  serverProps.formState by the RSC wrapper. Keyed by dotted path. */
    initialRichTextRendered?: RichTextRenderedMap;
    operation?: 'create' | 'update';
    /** For upload-collection edit views: the saved doc's preview metadata
     *  so the header can render the existing file without an extra fetch.
     *  Null on create or for non-upload collections. */
    initialUploadDoc?: (DropzoneExisting & {
        crop?: UploadEdits['crop'] | null;
        focalPoint?: {
            x: number;
            y: number;
        } | null;
    }) | null;
    /** v3.8 — locales available to this doc. Undefined when localization is
     *  not configured. */
    locales?: ExtractedLocale[];
    /** v3.8 — default locale code from payload config; falls back to the
     *  first available locale. */
    defaultLocale?: string;
    /** v3.8 — locale to start in. Set by the RSC wrapper from URL `?locale=`
     *  or `defaultLocale`. */
    initialLocale?: string;
};
export declare function AutoDocFormBridge({ mode, collectionSlug, globalSlug, docId, collection, useAsTitleBySlug, uploadCollectionsBySlug, initialValues, initialRichTextRendered, operation: operationProp, initialUploadDoc, locales, defaultLocale, initialLocale, }: AutoDocFormBridgeProps): React.ReactElement;
export {};

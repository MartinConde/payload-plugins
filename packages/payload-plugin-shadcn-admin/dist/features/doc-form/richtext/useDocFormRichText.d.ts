import { type RichTextRenderedMap } from './extractRichTextRenderedFields.js';
import type { ExtractedField } from 'payload-plugin-shadcn-ui';
type Args = {
    collectionFields: ExtractedField[];
    collectionSlug: string;
    /** Reads the current locale-projected data. Not a hook dep — read lazily. */
    getProjectedData: () => Record<string, unknown>;
    /** Stable trigger: refetch when this changes (e.g. picked richText paths,
     *  or simply whether the schema has any richText/array/blocks at all). */
    trigger: string;
    activeLocale: string | null;
    operation: 'create' | 'update';
};
export declare function useDocFormRichText({ collectionFields, collectionSlug, getProjectedData, trigger, activeLocale, operation, }: Args): RichTextRenderedMap;
export {};

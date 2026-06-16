import type { ArrayField } from 'payload';
export type GalleryFieldOptions = {
    /** Name of the array field. Defaults to `'gallery'`. */
    name?: string;
    /** Payload upload collection slug the image sub-field targets.
     *  Defaults to `'media'`. */
    relationTo?: string;
    /** Label applied to the array field (passed through to Payload). */
    label?: string | false;
    /** When `true`, the caption sub-field is marked `localized: true` so
     *  each language gets its own caption value. Defaults to `false`. */
    localized?: boolean;
    /** When `true`, at least one item is required in the array. */
    required?: boolean;
};
/** Returns a Payload `ArrayField` configured for gallery use with the
 *  `GalleryArrayInput` shadcn-admin override attached. */
export declare function galleryField(opts?: GalleryFieldOptions): ArrayField;

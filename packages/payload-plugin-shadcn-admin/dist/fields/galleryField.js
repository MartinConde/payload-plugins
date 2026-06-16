/* Server-safe field builder for gallery array fields.

   Usage in a collection config:

     import { galleryField } from 'payload-plugin-shadcn-admin'

     export const MyCollection: CollectionConfig = {
       fields: [
         galleryField(),                          // name: 'gallery', relationTo: 'media'
         galleryField({ name: 'bilder' }),        // custom array field name
         galleryField({ localized: true }),       // caption is localized
         galleryField({
           name: 'gallery',
           relationTo: 'media-alt',              // custom upload collection slug
           required: true,
         }),
       ],
     }

   Storage shape is a standard Payload array: [{ id, image, caption }].
   Existing data in a hand-built array with the same sub-field names is
   fully compatible — just add `galleryField()` to swap the admin UI.

   The override component (`GalleryArrayInput`) is a `'use client'` module
   referenced here via `custom['plugin-shadcn-admin'].input`.  The importMap
   in the host Payload config resolves the RSC→client boundary automatically
   (the same mechanism the SEO plugin uses for its SeoGroupInput). */ import { GalleryArrayInput } from '../features/doc-form/gallery/GalleryArrayInput.js';
/** Returns a Payload `ArrayField` configured for gallery use with the
 *  `GalleryArrayInput` shadcn-admin override attached. */ export function galleryField(opts = {}) {
    const { name = 'gallery', relationTo = 'media', label, localized = false, required } = opts;
    return {
        name,
        type: 'array',
        ...label !== undefined ? {
            label
        } : {},
        ...required !== undefined ? {
            required
        } : {},
        fields: [
            {
                name: 'image',
                type: 'upload',
                relationTo,
                required: true
            },
            {
                name: 'caption',
                type: 'text',
                localized
            }
        ],
        custom: {
            'plugin-shadcn-admin': {
                input: GalleryArrayInput
            }
        }
    };
}

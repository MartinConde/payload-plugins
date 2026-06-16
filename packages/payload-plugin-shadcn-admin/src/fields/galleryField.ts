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
   (the same mechanism the SEO plugin uses for its SeoGroupInput). */

import type { ArrayField } from 'payload'
import { GalleryArrayInput } from '../features/doc-form/gallery/GalleryArrayInput.js'

export type GalleryFieldOptions = {
  /** Name of the array field. Defaults to `'gallery'`. */
  name?: string
  /** Payload upload collection slug the image sub-field targets.
   *  Defaults to `'media'`. */
  relationTo?: string
  /** Label applied to the array field (passed through to Payload). */
  label?: string | false
  /** When `true`, the caption sub-field is marked `localized: true` so
   *  each language gets its own caption value. Defaults to `false`. */
  localized?: boolean
  /** When `true`, at least one item is required in the array. */
  required?: boolean
}

/** Returns a Payload `ArrayField` configured for gallery use with the
 *  `GalleryArrayInput` shadcn-admin override attached. */
export function galleryField(opts: GalleryFieldOptions = {}): ArrayField {
  const {
    name = 'gallery',
    relationTo = 'media',
    label,
    localized = false,
    required,
  } = opts

  return {
    name,
    type: 'array',
    ...(label !== undefined ? { label } : {}),
    ...(required !== undefined ? { required } : {}),
    fields: [
      {
        name: 'image',
        type: 'upload',
        relationTo,
        required: true,
      },
      {
        name: 'caption',
        type: 'text',
        localized,
      },
    ],
    custom: {
      'plugin-shadcn-admin': { input: GalleryArrayInput },
    },
  }
}

'use client'

/* Standalone richText editors for forms that have no per-doc RSC form state —
   the bulk-edit drawer (list view) and the custom upload dialog (create). We
   fetch the pre-rendered Payload <RichTextField/> elements the same way the
   doc-form bridge rebuilds them on a locale switch: a getFormState call scoped
   to the (locale-projected) data, with renderAllFields so every richText path
   comes back rendered. We refetch when the `trigger` changes (e.g. the set of
   picked/structural paths) or the locale changes — never per keystroke (a
   mounted Lexical editor owns its own state, exactly like the doc form). */

import * as React from 'react'
import { useServerFunctions } from '../../../internal/payloadAdapter.js'

import {
  extractRichTextRenderedFields,
  type RichTextRenderedMap,
} from './extractRichTextRenderedFields.js'
import type { ExtractedField } from 'payload-plugin-shadcn-ui'

type Args = {
  collectionFields: ExtractedField[]
  collectionSlug: string
  /** Reads the current locale-projected data. Not a hook dep — read lazily. */
  getProjectedData: () => Record<string, unknown>
  /** Stable trigger: refetch when this changes (e.g. picked richText paths,
   *  or simply whether the schema has any richText/array/blocks at all). */
  trigger: string
  activeLocale: string | null
  operation: 'create' | 'update'
}

export function useDocFormRichText({
  collectionFields,
  collectionSlug,
  getProjectedData,
  trigger,
  activeLocale,
  operation,
}: Args): RichTextRenderedMap {
  const serverFunctions = useServerFunctions()
  const [rendered, setRendered] = React.useState<RichTextRenderedMap>({})
  const getDataRef = React.useRef(getProjectedData)
  getDataRef.current = getProjectedData

  React.useEffect(() => {
    if (!trigger) {
      setRendered({})
      return
    }
    let cancelled = false
    const ctrl = new AbortController()
    void (async () => {
      try {
        const data = getDataRef.current()
        const result = await serverFunctions.getFormState({
          signal: ctrl.signal,
          collectionSlug,
          schemaPath: collectionSlug,
          data: data as never,
          operation,
          // No per-doc permissions in these contexts; renderAllFields forces
          // every field (incl. richText) to render regardless of gating.
          docPermissions: { fields: {} } as never,
          docPreferences: { fields: {} } as never,
          renderAllFields: true,
          ...(activeLocale ? { locale: activeLocale } : {}),
        } as never)
        if (cancelled) return
        const state = (result as { state?: Record<string, unknown> }).state
        if (!state) return
        setRendered(
          extractRichTextRenderedFields(
            { fields: collectionFields } as never,
            data,
            state as never,
          ),
        )
      } catch {
        // Aborted or failed — keep whatever was rendered before.
      }
    })()
    return () => {
      cancelled = true
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, activeLocale, collectionSlug, operation])

  return rendered
}

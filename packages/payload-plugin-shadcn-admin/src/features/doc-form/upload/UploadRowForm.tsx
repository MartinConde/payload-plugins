'use client'

/* One file's create form, rendered through the shared field-tree renderer so
   every field type (incl. group/tabs/array/blocks/richText) is supported.
   Owns its own richText fetch + locale-aware writes; the parent (UploadNewDialog)
   holds the row's value tree and orchestrates submit. A standalone component
   (not an inline map callback) so the per-row hooks obey the rules of hooks. */

import * as React from 'react'
import type { ExtractedCollection, ExtractedField } from 'payload-plugin-shadcn-ui'
import {
  collectLocalizedSchemaPaths,
  getByPath,
  isObject,
  isRenderableHere,
  projectLocaleAtLeaves,
  setByPath,
  stripPathIndices,
} from '../fieldTree/sharedHelpers.js'
import { makeFieldTreeRenderer } from '../fieldTree/FieldTreeRenderer.js'
import { useDocFormRichText } from '../richtext/useDocFormRichText.js'
import { schemaHasFormStateFields } from './uploadRowHelpers.js'

export type UploadRowFormProps = {
  rowId: string
  collectionSlug: string
  collectionFields: ExtractedField[]
  values: Record<string, unknown>
  errors: Record<string, string>
  onValuesChange: (next: Record<string, unknown>) => void
  onErrorClear: (path: string) => void
  useAsTitleBySlug: Record<string, string | undefined>
  uploadCollectionsBySlug: Record<string, ExtractedCollection>
  activeLocale: string | null
  localizationEnabled: boolean
  disabled: boolean
}

export function UploadRowForm({
  rowId,
  collectionSlug,
  collectionFields,
  values,
  errors,
  onValuesChange,
  onErrorClear,
  useAsTitleBySlug,
  uploadCollectionsBySlug,
  activeLocale,
  localizationEnabled,
  disabled,
}: UploadRowFormProps): React.ReactElement {
  const valuesRef = React.useRef(values)
  valuesRef.current = values

  const localizedSchemaPaths = React.useMemo(() => {
    const out = new Set<string>()
    collectLocalizedSchemaPaths(collectionFields, '', out)
    return out
  }, [collectionFields])
  const isPathLocalized = React.useCallback(
    (path: string): boolean =>
      localizationEnabled && localizedSchemaPaths.has(stripPathIndices(path)),
    [localizationEnabled, localizedSchemaPaths],
  )

  const setValueAtPath = React.useCallback(
    (path: string, next: unknown) => {
      const prev = valuesRef.current
      let updated: Record<string, unknown>
      if (isPathLocalized(path) && activeLocale) {
        const cur = getByPath(prev, path)
        const merged: Record<string, unknown> = isObject(cur)
          ? { ...cur, [activeLocale]: next }
          : { [activeLocale]: next }
        updated = setByPath(prev, path, merged)
      } else {
        updated = setByPath(prev, path, next)
      }
      onValuesChange(updated)
      onErrorClear(path)
    },
    [isPathLocalized, activeLocale, onValuesChange, onErrorClear],
  )

  const getProjectedData = React.useCallback(
    (): Record<string, unknown> =>
      localizationEnabled && activeLocale
        ? projectLocaleAtLeaves(valuesRef.current, collectionFields, activeLocale)
        : valuesRef.current,
    [localizationEnabled, activeLocale, collectionFields],
  )

  // Fetch richText editors once when the schema has form-state fields; refetch
  // on locale change (handled inside the hook's deps).
  const richTextTrigger = React.useMemo(
    () => (schemaHasFormStateFields(collectionFields) ? 'on' : ''),
    [collectionFields],
  )
  const richTextRendered = useDocFormRichText({
    collectionFields,
    collectionSlug,
    getProjectedData,
    trigger: richTextTrigger,
    activeLocale,
    operation: 'create',
  })

  const renderer = makeFieldTreeRenderer({
    values,
    errors,
    activeLocale,
    localizationEnabled,
    disabled,
    setValueAtPath,
    richTextRendered,
    useAsTitleBySlug,
    uploadCollectionsBySlug,
    operation: 'create',
    idPrefix: `upload-${rowId}-`,
  })

  const topLevel = React.useMemo(
    () => collectionFields.filter(isRenderableHere),
    [collectionFields],
  )

  return (
    <div className="flex flex-col gap-4">
      {topLevel.map((f) => renderer.renderChild(f, ''))}
    </div>
  )
}

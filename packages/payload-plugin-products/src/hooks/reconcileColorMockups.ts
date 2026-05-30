import type { CollectionBeforeChangeHook } from 'payload'

import { reconcileColorMockupsPure, refToId, type ViewRow } from '../ui/printArea.js'

/* Collection beforeChange on products: align each view's `colorMockups[]`
   with the product-level `colors[]` relationship. Rows whose color is no
   longer present are pruned; missing colors get fresh empty rows.

   Idempotent — running the hook twice with the same input data yields the
   same result, because identity is the color-swatch id (not the array index)
   and existing rows are preserved across the rebuild. */
export const reconcileColorMockups: CollectionBeforeChangeHook = ({ data }) => {
  if (!data || typeof data !== 'object') return data

  const colorsRaw = Array.isArray(data.colors) ? data.colors : []
  const colorIds = colorsRaw
    .map(refToId)
    .filter((id): id is string | number => id !== null)
    .map(String)

  const views: ViewRow[] = Array.isArray(data.views) ? data.views : []
  if (views.length === 0) return data

  data.views = reconcileColorMockupsPure(colorIds, views)
  return data
}

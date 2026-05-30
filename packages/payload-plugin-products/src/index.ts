export { productsPlugin } from './plugin.js'
export type { ProductsPluginConfig } from './types.js'

// Node-safe print-area model + pure helpers + presets, shared with the frontend.
export {
  normalizePrintAreasValue,
  newPrintArea,
  aspectOf,
  aspectFromDims,
  placementFromPrintArea,
  printAreaFromPlacement,
  normalizePlacement,
  normalizePlacements,
  A_SERIES_PRESETS,
  type PrintArea,
  type PrintAreaPlacement,
  type PrintAreasValue,
  type PrintAreaPreset,
  type ViewDims,
} from './ui/printArea.js'

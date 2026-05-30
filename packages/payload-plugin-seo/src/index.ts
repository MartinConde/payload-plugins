export { seoPlugin } from './plugin.js'
export { seoField, type SeoFieldOptions } from './fields/seoField.js'
export type { SeoPluginConfig } from './types.js'

// Pure, Node-safe helpers for the frontend (assemble tags from stored data).
export {
  buildJsonLd,
  type SchemaBlock,
  type OrganizationData,
  type BuildJsonLdOptions,
} from './schema/buildJsonLd.js'
export {
  buildBreadcrumbList,
  type BreadcrumbItem,
} from './schema/buildBreadcrumbList.js'
export {
  resolveTemplate,
  SEO_TEMPLATE_TOKENS,
  type SeoTemplateToken,
  type TemplateVars,
} from './templates/resolveTemplate.js'

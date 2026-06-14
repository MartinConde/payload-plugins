/* Pure, dependency-free schema.org mappers + the `{{token}}` meta-template
   resolver. No Payload / React imports — safe to import from a frontend (e.g. an
   Astro/Worker bundle) to render JSON-LD and resolve title/description patterns
   without pulling the Payload-dependent package root into the bundle. */ export { buildJsonLd } from '../schema/buildJsonLd.js';
export { buildBreadcrumbList } from '../schema/buildBreadcrumbList.js';
export { resolveTemplate, SEO_TEMPLATE_TOKENS } from '../templates/resolveTemplate.js';

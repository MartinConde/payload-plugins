/** Documented built-in tokens. Consumers may pass any extra keys in `vars`. */
export declare const SEO_TEMPLATE_TOKENS: readonly ["title", "sitename", "excerpt", "separator", "category"];
export type SeoTemplateToken = (typeof SEO_TEMPLATE_TOKENS)[number];
export type TemplateVars = Partial<Record<SeoTemplateToken, unknown>> & Record<string, unknown>;
/**
 * Resolve a `{{token}}` template against `vars`. Returns '' for an empty
 * template. Whitespace runs are collapsed and the result is trimmed so missing
 * tokens don't leave stray separators.
 */
export declare function resolveTemplate(template: string | null | undefined, vars?: TemplateVars): string;

import type { ExtractedField } from 'payload-plugin-shadcn-ui';
/** Escape a plain string so `getHTMLDiffComponents` (which diffs HTML) treats
 *  it as literal text rather than markup. */
export declare const escapeForDiff: (s: string) => string;
/** HTML serialization of a Lexical richText value for the structural diff.
 *  Text content is escaped; structural/format tags are literal. */
export declare const richTextToDiffHTML: (value: unknown) => string;
/** Reduce a leaf field value (already projected to a single locale) to a
 *  display string. Used for both From and To sides of the diff. */
export declare const stringifyDiffValue: (field: ExtractedField, value: unknown) => string;

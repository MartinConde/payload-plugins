import type { ExtractedField } from 'payload-plugin-shadcn-ui';
import { type Perms } from './access-control/fieldPermissions.js';
import type { RichTextRenderedMap } from './richtext/extractRichTextRenderedFields.js';
export declare const isEmpty: (v: unknown) => boolean;
export declare const focusFirstError: (errs: Record<string, string>) => void;
export declare const buildAuthCreateFields: () => ExtractedField[];
export declare const deepEqual: (a: unknown, b: unknown) => boolean;
export declare const findBlocksField: (fields: ExtractedField[], name: string) => (ExtractedField & {
    type: "blocks";
}) | undefined;
export declare const rekeyRichTextOnRowMove: (current: RichTextRenderedMap, arrayPath: string, prevIds: (string | null)[], nextIds: (string | null)[]) => RichTextRenderedMap;
export declare const findJsonParseError: (value: unknown, prefix: string) => {
    path: string;
    message: string;
} | null;
export declare const collectRequiredEmptyPaths: (fields: ExtractedField[], values: unknown, prefix: string, parentPerms: Perms) => {
    name: string;
    path: string;
    label: string;
}[];
export declare const seedDefaults: (fields: ExtractedField[]) => Record<string, unknown>;
export declare const collectTopLevelKeys: (fields: ExtractedField[]) => Set<string>;

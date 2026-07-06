import type { ExtractedField } from 'payload-plugin-shadcn-ui';
export declare const FORM_STATE_TYPES: Set<string>;
export declare const schemaHasFormStateFields: (fields: ExtractedField[]) => boolean;
export declare const topLevelRequiredLeafNames: (fields: ExtractedField[]) => string[];
export declare const isEmptyValue: (v: unknown) => boolean;
export declare const nextRowId: () => string;

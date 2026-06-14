import type { ExtractedField } from 'payload-plugin-shadcn-ui';
export declare const SUPPORTED_DOC_FORM_TYPES: Set<string>;
export declare const isFieldSupportedForDocForm: (field: ExtractedField) => boolean;
export declare const findBlockingRequiredFields: (collection: {
    fields?: any[];
    upload?: unknown;
}) => {
    name: string;
    type: string;
}[];

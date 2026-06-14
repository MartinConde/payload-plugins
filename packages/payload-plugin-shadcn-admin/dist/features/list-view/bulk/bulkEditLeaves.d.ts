import type { ExtractedField } from 'payload-plugin-shadcn-ui';
export type PickableField = {
    /** Full dotted path, e.g. `title`, `myGroup.subfield`, `myTab.items`. */
    path: string;
    /** Path prefix to hand renderField (everything before `field.name`). */
    pathPrefix: string;
    field: ExtractedField;
    /** Breadcrumb label, e.g. `Group › Subfield`. */
    label: string;
    type: string;
};
export declare const collectBulkEditableLeaves: (fields: ExtractedField[]) => PickableField[];

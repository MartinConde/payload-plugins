import type { ExtractedField } from 'payload-plugin-shadcn-ui';
type CreateFirstUserFormProps = {
    userSlug: string;
    fields: ExtractedField[];
    useAsTitleBySlug: Record<string, string | undefined>;
    initialValues: Record<string, unknown>;
};
export declare function CreateFirstUserForm({ userSlug, fields, useAsTitleBySlug, initialValues, }: CreateFirstUserFormProps): import("react/jsx-runtime").JSX.Element;
export {};

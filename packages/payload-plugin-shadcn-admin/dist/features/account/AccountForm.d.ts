import type { ExtractedField } from 'payload-plugin-shadcn-ui';
import type { Perms } from '../doc-form/access-control/fieldPermissions.js';
type AccountFormProps = {
    userSlug: string;
    userId: string | number;
    fields: ExtractedField[];
    initialValues: Record<string, unknown>;
    useAsTitleBySlug: Record<string, string | undefined>;
    docPermissions?: Perms;
    useAPIKey?: boolean;
    verify?: boolean;
    verified?: boolean;
    initialApiKey?: string | null;
    initialEnableAPIKey?: boolean;
    /** Admin-language options for the language selector. Built from the config's
     *  supported languages by AutoAccountView; when 0–1 entries, the selector is
     *  hidden (nothing to switch between). */
    languageOptions?: {
        value: string;
        label: string;
    }[];
};
export declare function AccountForm({ userSlug, userId, fields, initialValues, useAsTitleBySlug, docPermissions, useAPIKey, verify, verified, initialApiKey, initialEnableAPIKey, languageOptions, }: AccountFormProps): import("react/jsx-runtime").JSX.Element;
export {};

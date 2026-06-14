export type GetUploadHandler = (args: {
    collectionSlug: string;
}) => ((args: {
    file: File;
    updateFilename: (value: string) => void;
}) => Promise<unknown>) | null | undefined;
export declare function buildUploadFormData({ body, file, collectionSlug, getUploadHandler, }: {
    body: Record<string, unknown>;
    file: File;
    collectionSlug: string;
    getUploadHandler: GetUploadHandler;
}): Promise<FormData>;
export type ParsedPayloadError = {
    errors?: Array<{
        field?: string;
        path?: string;
        message?: string;
        data?: {
            errors?: Array<{
                field?: string;
                path?: string;
                message?: string;
            }>;
        };
    }>;
    message?: string;
};
export declare function parsePayloadErrorResponse(parsed: ParsedPayloadError): {
    fieldErrors: Record<string, string>;
    fallback: string | null;
};

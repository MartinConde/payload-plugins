import type { ExtractedCollection } from 'payload-plugin-shadcn-ui';
export type RichTextRenderedEntry = {
    /** Pre-built <RichTextField/> element with all heavy props baked in.
     *  Renderable verbatim inside the Form shim. */
    Field: unknown;
    /** Initial SerializedEditorState value at this path. */
    initialValue: unknown;
};
export type RichTextRenderedMap = Record<string, RichTextRenderedEntry>;
export declare function extractRichTextRenderedFields(collection: ExtractedCollection, data: unknown, formState: Record<string, {
    customComponents?: {
        Field?: unknown;
    };
    value?: unknown;
}> | undefined): RichTextRenderedMap;

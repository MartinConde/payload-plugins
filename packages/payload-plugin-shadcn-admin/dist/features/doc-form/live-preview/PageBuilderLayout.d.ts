import * as React from 'react';
import type { ExtractedCollection, ExtractedField } from 'payload-plugin-shadcn-ui';
import { type Perms } from '../access-control/fieldPermissions.js';
import type { FieldTreeRenderer } from '../fieldTree/FieldTreeRenderer.js';
export type PageBuilderLayoutProps = {
    livePreviewEnabled: boolean;
    pageBuilderAvailable: boolean;
    layoutField: (ExtractedField & {
        type: 'blocks';
    }) | undefined;
    /** Name of the blocks field the page-builder layer treats as the editable
     *  layout — mirrors `layoutField?.name` when a field was found, but is
     *  the only signal left when it wasn't (matches the bridge's own
     *  `layoutField?.name ?? blocksFieldName` fallback). */
    blocksFieldName: string;
    livePreviewOpen: boolean;
    setLivePreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
    builderModeOpen: boolean;
    isMobile: boolean;
    values: Record<string, unknown>;
    setValueAtPath: (path: string, next: unknown) => void;
    activeLocale: string | null;
    localizationEnabled: boolean;
    collection: ExtractedCollection;
    fallbackLocale: string | null;
    docPermissions: Perms;
    submitting: boolean;
    renderChild: FieldTreeRenderer['renderChild'];
    mainFieldsContent: React.ReactNode;
    hasSidebar: boolean;
    sidebarTop: ExtractedField[];
    selectedBlockId: string | null;
    setSelectedBlockId: React.Dispatch<React.SetStateAction<string | null>>;
};
export declare function PageBuilderLayout({ livePreviewEnabled, pageBuilderAvailable, layoutField, blocksFieldName, livePreviewOpen, setLivePreviewOpen, builderModeOpen, isMobile, values, setValueAtPath, activeLocale, localizationEnabled, collection, fallbackLocale, docPermissions, submitting, renderChild, mainFieldsContent, hasSidebar, sidebarTop, selectedBlockId, setSelectedBlockId, }: PageBuilderLayoutProps): React.ReactElement;

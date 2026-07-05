import * as React from 'react';
import type { ExtractedBlock } from 'payload-plugin-shadcn-ui';
export type BlockPickerSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    blocks: ExtractedBlock[];
    onSelect: (slug: string) => void;
};
export declare function BlockPickerSheet({ open, onOpenChange, blocks, onSelect, }: BlockPickerSheetProps): React.ReactElement;

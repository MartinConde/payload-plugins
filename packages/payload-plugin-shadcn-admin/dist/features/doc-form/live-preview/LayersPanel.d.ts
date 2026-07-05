import * as React from 'react';
import type { ExtractedBlock } from 'payload-plugin-shadcn-ui';
import type { BlockRow } from '../inputs/BlocksInput.js';
export type LayersPanelProps = {
    /** Same normalized rows the bridge computes for `BlockSettingsPanel`. */
    rows: BlockRow[];
    blocks: ExtractedBlock[];
    /** Full replacement array — mirrors `BlocksInput`'s `onChange`, i.e. the
     *  bridge does `setValueAtPath(layoutBasePath, next)` with this. */
    onReorder: (next: BlockRow[]) => void;
    onDuplicate: (blockId: string) => void;
    onDelete: (blockId: string) => void;
    disabled?: boolean;
};
export declare function LayersPanel({ rows, blocks, onReorder, onDuplicate, onDelete, disabled, }: LayersPanelProps): React.ReactElement;

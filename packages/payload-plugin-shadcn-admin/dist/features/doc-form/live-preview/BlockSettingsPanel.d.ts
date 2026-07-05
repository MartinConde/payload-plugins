import * as React from 'react';
import type { ExtractedBlock } from 'payload-plugin-shadcn-ui';
import type { FieldTreeRenderer } from '../fieldTree/FieldTreeRenderer.js';
import type { Perms } from '../access-control/fieldPermissions.js';
import type { BlockRow } from '../inputs/BlocksInput.js';
export type BlockSettingsPanelProps = {
    /** Normalized `layout` rows (same shape `BlocksInput` renders from). */
    rows: BlockRow[];
    /** The `layout` field's available block types (for labels + subfield defs). */
    blocks: ExtractedBlock[];
    /** Locale-aware base path for the layout array (e.g. `layout` or
     *  `layout.en`) — computed by the bridge the same way `FieldTreeRenderer`
     *  computes `childBasePath`, so this stays correct if `layout` is ever
     *  localized. Do not hardcode `'layout'` here. */
    layoutBasePath: string;
    renderChild: FieldTreeRenderer['renderChild'];
    /** The `layout` field's own FieldPermissions — forwarded per-block exactly
     *  as `BlocksInput` does (`blockPerms.blocks[row.blockType]`). */
    blockPerms?: Perms;
    disabled?: boolean;
};
export declare function BlockSettingsPanel({ rows, blocks, layoutBasePath, renderChild, blockPerms, disabled, }: BlockSettingsPanelProps): React.ReactElement;

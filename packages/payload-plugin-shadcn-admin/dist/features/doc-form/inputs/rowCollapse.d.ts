import * as React from 'react';
import type { ExtractedField } from 'payload-plugin-shadcn-ui';
export type UseRowCollapseReturn = {
    isCollapsed: (id: string) => boolean;
    toggle: (id: string) => void;
    collapseAll: () => void;
    expandAll: () => void;
    markExpanded: (id: string) => void;
};
/**
 * Tracks collapsed/expanded state per stable row id.
 *
 * - All ids present on first render start **collapsed** (true).
 * - Ids not in the map default to **expanded** (false) — newly-added rows that
 *   haven't been explicitly registered yet are treated as open.
 * - Call `markExpanded(id)` right after creating a new row so "Collapse all"
 *   can later reach it.
 * - `collapseAll`/`expandAll` operate on the live set of ids in the map.
 */
export declare function useRowCollapse(rowIds: string[]): UseRowCollapseReturn;
export declare function RowCollapseControls({ onCollapseAll, onExpandAll, }: {
    onCollapseAll: () => void;
    onExpandAll: () => void;
}): React.ReactElement;
/**
 * Returns a short preview string for a collapsed row — the value of the first
 * text/textarea/email subfield that has a non-empty value. Handles both plain
 * strings and locale-keyed objects `{ de: '…', en: '…' }` (picks the first
 * non-empty locale value). Returns `undefined` if no preview can be derived.
 */
export declare function deriveRowPreview(subfields: ExtractedField[], row: Record<string, unknown>): string | undefined;

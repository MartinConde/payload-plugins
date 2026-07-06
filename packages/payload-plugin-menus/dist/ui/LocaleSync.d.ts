import * as React from 'react';
import { type MenuTree } from '../menuTree.js';
import { type Tr } from './menuTreeMutations.js';
export declare function LocaleSync({ activeLocale, tree, disabled, useAsTitleBySlug, tr, onApply, }: {
    activeLocale: string;
    tree: MenuTree;
    disabled?: boolean;
    useAsTitleBySlug: Record<string, string | undefined>;
    tr: Tr;
    onApply: (next: MenuTree) => void;
}): React.ReactElement | null;

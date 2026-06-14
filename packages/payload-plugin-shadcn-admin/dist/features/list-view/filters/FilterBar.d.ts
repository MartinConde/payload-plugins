import * as React from 'react';
import type { CollectionMeta } from '../columns/fieldPicker.js';
type Props = {
    collection: CollectionMeta;
    useAsTitleBySlug?: Record<string, string | undefined>;
};
export declare function FilterBar({ collection, useAsTitleBySlug, }: Props): React.ReactElement;
export {};

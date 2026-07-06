import * as React from 'react';
import type { PickableField } from './bulkEditLeaves.js';
export declare const formatDiffValue: (value: unknown) => string;
export declare function ReviewList({ pickedPaths, leafByPath, projected, count, useAsTitleBySlug, }: {
    pickedPaths: string[];
    leafByPath: Map<string, PickableField>;
    projected: Record<string, unknown>;
    count: number;
    useAsTitleBySlug: Record<string, string | undefined>;
}): React.ReactElement;

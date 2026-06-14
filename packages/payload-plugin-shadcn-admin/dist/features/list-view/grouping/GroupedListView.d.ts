import * as React from 'react';
import type { GroupData } from './getGroupedData.js';
export type GroupedListViewProps = {
    collectionSlug: string;
    collection: {
        slug: string;
        fields: any[];
        admin?: any;
    };
    useAsTitleBySlug: Record<string, string | undefined>;
    nativeCellFieldNames?: ReadonlyArray<string>;
    nativeCellsByRow?: Record<string, Record<string, React.ReactNode>>;
    groups: GroupData[];
    groupByLabel: string;
    totalGroups: number;
    capped: boolean;
};
export declare function GroupedListView({ collectionSlug, collection, useAsTitleBySlug, nativeCellFieldNames, nativeCellsByRow, groups, groupByLabel, totalGroups, capped, }: GroupedListViewProps): React.ReactElement;

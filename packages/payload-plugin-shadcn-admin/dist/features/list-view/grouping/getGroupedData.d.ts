import type { ListViewServerProps, Where } from '../../../internal/payloadAdapter.js';
import type { FieldMeta } from '../columns/fieldPicker.js';
/** Max groups rendered. */
export declare const GROUP_CAP = 50;
/** Max docs pulled for grouping (one query). */
export declare const GROUP_FETCH_CAP = 500;
export type GroupData = {
    /** Stable key for React + per-group table. */
    key: string;
    /** Display heading (resolved relationship title / formatted date / etc.). */
    heading: string;
    count: number;
    rows: Array<{
        id: number | string;
        [k: string]: unknown;
    }>;
};
export type GroupedResult = {
    groups: GroupData[];
    /** Total distinct groups found in the fetched window (for the note). */
    totalGroups: number;
    /** True when the collection has more docs than we fetched, OR more groups
     *  than GROUP_CAP — i.e. the view is showing a partial picture. */
    capped: boolean;
};
export declare function getGroupedData({ payload, collectionSlug, groupByName, groupByField, sortDesc, where, search, trash, locale, user, useAsTitleBySlug, noValueLabel, }: {
    payload: ListViewServerProps['payload'];
    collectionSlug: string;
    groupByName: string;
    groupByField: FieldMeta;
    sortDesc: boolean;
    where?: Where;
    search?: string;
    trash: boolean;
    locale?: string;
    user: ListViewServerProps['user'];
    /** related-slug → useAsTitle, for relationship group headings. */
    useAsTitleBySlug: Record<string, string | undefined>;
    noValueLabel: string;
}): Promise<GroupedResult>;

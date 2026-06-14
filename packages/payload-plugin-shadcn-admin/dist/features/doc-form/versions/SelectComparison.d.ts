import * as React from 'react';
export type ComparisonOption = {
    value: string;
    label: string;
};
export type SelectComparisonProps = {
    options: ComparisonOption[];
    /** Currently selected `?versionFrom=` value, or null for the default
     *  (previous version). */
    selected: string | null;
};
export declare function SelectComparison({ options, selected, }: SelectComparisonProps): React.ReactElement;

import * as React from 'react';
export type ViewTabsProps = {
    active: number;
    onActive: (index: number) => void;
    presets: string[];
    disabled?: boolean;
};
export declare function ViewTabs({ active, onActive, presets, disabled, }: ViewTabsProps): React.ReactElement;

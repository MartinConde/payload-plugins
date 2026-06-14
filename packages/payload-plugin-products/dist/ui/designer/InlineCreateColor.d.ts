import * as React from 'react';
export type InlineCreateColorProps = {
    colorSwatchesSlug: string;
    onCreated: (id: string) => void;
    disabled?: boolean;
};
export declare function InlineCreateColor({ colorSwatchesSlug, onCreated, disabled, }: InlineCreateColorProps): React.ReactElement;

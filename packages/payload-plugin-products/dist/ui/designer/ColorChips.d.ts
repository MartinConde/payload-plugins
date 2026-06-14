import * as React from 'react';
export type ColorChipsProps = {
    activeColor: number;
    onActiveColor: (index: number) => void;
    viewIndex: number;
    colorSwatchesSlug: string;
    disabled?: boolean;
};
export declare function ColorChips({ activeColor, onActiveColor, viewIndex, colorSwatchesSlug, disabled, }: ColorChipsProps): React.ReactElement | null;

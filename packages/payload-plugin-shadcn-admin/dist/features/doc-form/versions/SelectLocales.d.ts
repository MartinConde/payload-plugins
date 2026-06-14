import * as React from 'react';
export type SelectLocalesProps = {
    locales: {
        code: string;
        label: string;
    }[];
    /** Currently selected locale codes (all by default). */
    selected: string[];
};
export declare function SelectLocales({ locales, selected, }: SelectLocalesProps): React.ReactElement;

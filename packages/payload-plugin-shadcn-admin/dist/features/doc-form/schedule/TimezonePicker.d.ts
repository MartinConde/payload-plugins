import * as React from 'react';
export declare function TimezonePicker({ value, onChange, options, disabled, }: {
    value: string;
    onChange: (next: string) => void;
    options: {
        label: string;
        value: string;
    }[];
    disabled?: boolean;
}): React.ReactElement;

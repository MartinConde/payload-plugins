import * as React from 'react';
export type DateInputProps = {
    id?: string;
    value: unknown;
    onChange: (next: string | null) => void;
    withTime?: boolean;
    required?: boolean;
    invalid?: boolean;
    disabled?: boolean;
};
export declare function DateInput({ id, value, onChange, withTime, invalid, disabled, }: DateInputProps): React.ReactElement;

import * as React from 'react';
export type PointInputProps = {
    id?: string;
    value: unknown;
    onChange: (next: [number, number] | null) => void;
    required?: boolean;
    invalid?: boolean;
    disabled?: boolean;
};
export declare function PointInput({ id, value, onChange, required, invalid, disabled, }: PointInputProps): React.ReactElement;

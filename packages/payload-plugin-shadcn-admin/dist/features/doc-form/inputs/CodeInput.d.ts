import * as React from 'react';
export type CodeInputProps = {
    id?: string;
    value: unknown;
    language?: string;
    onChange: (next: string) => void;
    required?: boolean;
    invalid?: boolean;
    disabled?: boolean;
};
export declare function CodeInput({ id, value, language, onChange, required, invalid, disabled, }: CodeInputProps): React.ReactElement;

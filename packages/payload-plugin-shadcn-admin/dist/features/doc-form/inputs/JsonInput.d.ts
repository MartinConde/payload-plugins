import * as React from 'react';
export declare const JSON_PARSE_ERROR_KEY = "__jsonParseError__";
export type JsonParseErrorMarker = {
    [JSON_PARSE_ERROR_KEY]: string;
    raw: string;
};
export declare const isJsonParseError: (v: unknown) => v is JsonParseErrorMarker;
export type JsonInputProps = {
    id?: string;
    value: unknown;
    onChange: (next: unknown) => void;
    required?: boolean;
    invalid?: boolean;
    disabled?: boolean;
};
export declare function JsonInput({ id, value, onChange, required, invalid, disabled, }: JsonInputProps): React.ReactElement;

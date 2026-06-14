import * as React from 'react';
export type PolyValue = {
    value: string | number;
    relationTo: string;
};
export type PolymorphicRelationshipInputProps = {
    id?: string;
    relationTo: string[];
    hasMany?: boolean;
    useAsTitleBySlug: Record<string, string | undefined>;
    value: unknown;
    onChange: (next: PolyValue | PolyValue[] | null) => void;
    invalid?: boolean;
    disabled?: boolean;
};
export declare function PolymorphicRelationshipInput({ id, relationTo, hasMany, useAsTitleBySlug, value, onChange, invalid, disabled, }: PolymorphicRelationshipInputProps): React.ReactElement;

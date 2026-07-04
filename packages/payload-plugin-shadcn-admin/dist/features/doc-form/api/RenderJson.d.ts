import * as React from 'react';
type ParentType = 'array' | 'object';
type RenderJsonProps = {
    object: unknown;
    objectKey?: string;
    parentType?: ParentType;
    isEmpty?: boolean;
    trailingComma?: boolean;
};
export declare function RenderJson({ object, objectKey, parentType, isEmpty, trailingComma, }: RenderJsonProps): React.JSX.Element;
export {};

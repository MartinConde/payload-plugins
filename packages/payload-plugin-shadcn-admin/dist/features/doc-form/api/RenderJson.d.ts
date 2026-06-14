type ParentType = 'array' | 'object';
type RenderJsonProps = {
    object: unknown;
    objectKey?: string;
    parentType?: ParentType;
    isEmpty?: boolean;
    trailingComma?: boolean;
};
export declare function RenderJson({ object, objectKey, parentType, isEmpty, trailingComma, }: RenderJsonProps): import("react/jsx-runtime").JSX.Element;
export {};

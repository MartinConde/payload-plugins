import * as React from 'react';
type Props = {
    relatedSlug: string;
    useAsTitle: string | undefined;
    multi: boolean;
    value: string | string[] | null;
    onChange: (value: string | string[] | null) => void;
    /** Dotted path to a relationship field on the related collection whose value
     *  chain identifies descendants of the current doc (e.g. `breadcrumbs.doc`
     *  for nested-docs). When set on a self-referential picker, docs that have
     *  the current doc in that chain are excluded — prevents parent cycles. */
    excludeDescendantsPath?: string;
};
export declare function RelationshipPicker({ relatedSlug, useAsTitle, multi, value, onChange, excludeDescendantsPath, }: Props): React.ReactElement;
export {};

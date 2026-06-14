import * as React from 'react';
export type InlineCreateTemplateProps = {
    printTemplatesSlug: string;
    onCreated: (id: string) => void;
    disabled?: boolean;
};
export declare function InlineCreateTemplate({ printTemplatesSlug, onCreated, disabled, }: InlineCreateTemplateProps): React.ReactElement;

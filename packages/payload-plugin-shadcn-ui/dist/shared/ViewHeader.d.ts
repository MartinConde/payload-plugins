import * as React from 'react';
export type Crumb = {
    label: string;
    href?: string;
};
export declare function ViewHeader({ breadcrumbs, actions, }: {
    breadcrumbs?: Crumb[];
    actions?: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;

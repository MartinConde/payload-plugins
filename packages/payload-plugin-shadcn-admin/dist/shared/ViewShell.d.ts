import * as React from 'react';
import { type Crumb } from './ViewHeader.js';
type ViewShellProps = {
    breadcrumbs?: Crumb[];
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    headerActions?: React.ReactNode;
};
export declare function ViewShell({ breadcrumbs, children, className, contentClassName, headerActions, }: ViewShellProps): import("react/jsx-runtime").JSX.Element;
export {};

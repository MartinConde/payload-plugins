import * as React from 'react';
type AuthShellProps = {
    /** Optional brand row rendered above the card (e.g. app name / logo). */
    brand?: React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    /** Optional content rendered below the card (e.g. a "back to login" link). */
    footer?: React.ReactNode;
    className?: string;
};
export declare function AuthShell({ brand, title, description, children, footer, className, }: AuthShellProps): import("react/jsx-runtime").JSX.Element;
export {};

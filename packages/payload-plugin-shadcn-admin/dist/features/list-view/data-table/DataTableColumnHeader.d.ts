import * as React from 'react';
import type { Column } from '@tanstack/react-table';
type DataTableColumnHeaderProps<TData, TValue> = React.HTMLAttributes<HTMLDivElement> & {
    column: Column<TData, TValue>;
    title: string;
};
export declare function DataTableColumnHeader<TData, TValue>({ column, title, className, }: DataTableColumnHeaderProps<TData, TValue>): import("react/jsx-runtime").JSX.Element;
export {};

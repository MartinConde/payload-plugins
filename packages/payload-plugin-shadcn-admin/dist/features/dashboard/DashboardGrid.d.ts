import * as React from 'react';
export type DashboardWidgetSize = 'sm' | 'md' | 'full';
export type DashboardWidget = {
    id: string;
    /** Shown in the "Add widget" menu when hidden, and as the resize/hide
     *  controls' accessible names. */
    label: string;
    node: React.ReactNode;
};
export declare function DashboardGrid({ widgets, }: {
    widgets: DashboardWidget[];
}): React.ReactElement | null;

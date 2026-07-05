import type { DashboardWidgetSize } from '../DashboardGrid.js';
export type UseDashboardLayoutPrefsReturn = {
    order: string[] | undefined;
    hidden: string[];
    sizes: Record<string, DashboardWidgetSize>;
    loaded: boolean;
    setOrder: (next: string[]) => void;
    setHidden: (next: string[]) => void;
    setSize: (id: string, size: DashboardWidgetSize) => void;
};
export declare function useDashboardLayoutPrefs(): UseDashboardLayoutPrefsReturn;

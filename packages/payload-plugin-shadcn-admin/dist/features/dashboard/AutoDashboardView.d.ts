import type { AdminViewServerProps, Payload } from '../../internal/payloadAdapter.js';
type NavGroup = {
    entities: {
        label: unknown;
        slug: string;
        type: 'collections' | 'globals';
    }[];
    label: string;
};
type DashboardViewProps = AdminViewServerProps & {
    navGroups?: NavGroup[];
    payload: Payload;
};
export declare function AutoDashboardView(props: DashboardViewProps): Promise<import("react/jsx-runtime").JSX.Element>;
export {};

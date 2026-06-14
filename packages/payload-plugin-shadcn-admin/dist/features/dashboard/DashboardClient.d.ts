export type DashboardItem = {
    count?: number;
    createHref?: string;
    label: string;
    listHref: string;
    slug: string;
    type: 'collections' | 'globals';
};
export type DashboardSection = {
    items: DashboardItem[];
    label: string;
};
export type RecentDoc = {
    collectionLabel: string;
    href: string;
    title: string;
    updatedAt: string | null;
};
export declare function DashboardClient({ recent, sections, }: {
    recent: RecentDoc[];
    sections: DashboardSection[];
}): import("react/jsx-runtime").JSX.Element;

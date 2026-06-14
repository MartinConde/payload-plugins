type Visibility = Record<string, boolean>;
export type UseColumnPrefsReturn = {
    order: string[] | undefined;
    visibility: Visibility;
    loaded: boolean;
    setOrder: (next: string[]) => void;
    setVisibility: (next: Visibility) => void;
    reset: () => void;
};
export declare function useColumnPrefs(collectionSlug: string): UseColumnPrefsReturn;
export {};

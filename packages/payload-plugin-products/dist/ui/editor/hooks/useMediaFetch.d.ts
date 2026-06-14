export type MediaInfo = {
    id: string;
    url: string;
    width: number;
    height: number;
};
export type LoadState = 'no-id' | 'loading' | 'loaded' | 'error';
export declare function useMediaFetch(mediaSlug: string, fieldPath?: string): {
    loadState: LoadState;
    media: MediaInfo | null;
};

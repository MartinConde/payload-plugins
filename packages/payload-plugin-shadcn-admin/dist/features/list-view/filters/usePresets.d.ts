export type Preset = {
    id: string;
    name: string;
    createdAt: number;
    where: Array<[string, string]>;
    sort: string | null;
    search: string | null;
};
export declare const PRESET_ERROR: {
    readonly AtLimit: "PRESET_AT_LIMIT";
    readonly NameExists: "PRESET_NAME_EXISTS";
    readonly EmptyName: "PRESET_EMPTY_NAME";
    readonly NotReady: "PRESET_NOT_READY";
};
export declare class PresetError extends Error {
    code: (typeof PRESET_ERROR)[keyof typeof PRESET_ERROR];
    constructor(code: (typeof PRESET_ERROR)[keyof typeof PRESET_ERROR]);
}
type UsePresetsResult = {
    presets: Preset[];
    loaded: boolean;
    atLimit: boolean;
    savePreset: (name: string, options?: {
        overwrite?: boolean;
    }) => Promise<Preset>;
    loadPreset: (id: string) => void;
    deletePreset: (id: string) => Promise<void>;
};
export declare function usePresets(collectionSlug: string): UsePresetsResult;
export {};

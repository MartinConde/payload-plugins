export type PillTone = 'muted' | 'success' | 'warn' | 'destructive';
/** Loosely-typed translate fn (accepts both default- and custom-keyed
 *  TFunctions). Optional everywhere — absent → English literals. */
export type PillT = (key: any, options?: any) => string;
export declare const toneClassName: (tone: PillTone) => string;
/** Persisted draft/published pill content — no lifecycle state. Shared by the
 *  versions list, the version diff header, and DocStatusBar's non-active
 *  locale pills. */
export declare const persistedStatusPill: (status: "draft" | "published" | null | undefined, t?: PillT) => {
    label: string;
    tone: PillTone;
};

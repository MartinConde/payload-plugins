import type { Plugin } from './internal/payloadAdapter.js';
import type { PluginConfig } from './types.js';
export type SkippedDocView = {
    kind: 'collection' | 'global';
    slug: string;
    types: string[];
};
export declare const shadcnAdminPlugin: (options?: PluginConfig) => Plugin;

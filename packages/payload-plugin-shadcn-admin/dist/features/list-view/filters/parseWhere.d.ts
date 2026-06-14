import type { Where } from '../../../internal/payloadAdapter.js';
type SearchParams = Record<string, string | string[] | undefined>;
export declare function parseWhere(searchParams: SearchParams | undefined): Where | undefined;
export {};

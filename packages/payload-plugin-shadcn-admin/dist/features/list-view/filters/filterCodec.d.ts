import type { FieldMeta } from '../columns/fieldPicker.js';
export type WhereOperator = 'contains' | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists';
export type FilterValue = string | string[] | boolean | null;
export type FilterChip = {
    id: string;
    field: string;
    operator: WhereOperator;
    value: FilterValue;
};
export type FilterGroup = {
    id: string;
    op: 'or';
    chips: FilterChip[];
};
export type FilterNode = {
    kind: 'chip';
    chip: FilterChip;
} | {
    kind: 'group';
    group: FilterGroup;
};
export type FilterState = {
    nodes: FilterNode[];
};
export declare const FILTER_STATE_SCHEMA_VERSION = 1;
export type OperatorDescriptor = {
    value: WhereOperator;
    /** Display token, NOT a finished string. Word tokens (`is`, `isNot`,
     *  `contains`, `isAnyOf`, `exists`, `in`, `after`, `before`, `on`) resolve to
     *  `shadcnAdmin:op*` translations via `resolveOperatorLabel`; symbol tokens
     *  (`=`, `≠`, `>`, `<`) pass through untranslated. Kept as a plain string so
     *  this codec stays a pure, i18n-free data module. */
    label: string;
    /** When true, the chip value is an array (rendered as multi-select). */
    multi?: boolean;
    /** When true, the value control is hidden (operator carries the meaning). */
    noValue?: boolean;
};
/** Resolve an `OperatorDescriptor.label` token to its display string for the
 *  active admin language. `t` is the caller's translate fn (passed in so this
 *  module imports no `@payloadcms/ui`); symbol tokens pass through. */
export declare const resolveOperatorLabel: (token: string, t: (key: any, options?: any) => string) => string;
export declare function operatorsForField(field: FieldMeta): OperatorDescriptor[];
export declare function defaultOperatorForField(field: FieldMeta): WhereOperator;
export declare function isFilterable(field: FieldMeta): boolean;
export declare function isPolymorphicRelationship(field: FieldMeta): boolean;
export declare const makeGroupId: () => string;
export declare function formatChipId(field: string, operator: string, occurrence: number): string;
export declare function countChipsForFieldOp(state: FilterState, field: string, operator: string): number;
export declare function applyStateToSearchParams(params: URLSearchParams, state: FilterState): void;
export declare function clearFilterKeys(params: URLSearchParams): void;
export declare function whereToState(where: unknown): FilterState;

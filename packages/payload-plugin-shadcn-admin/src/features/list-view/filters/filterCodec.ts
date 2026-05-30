/* Encode / decode the filter chip state ↔ URL searchParams.

   Encoding rule:
   - No OR groups → emit flat keys (`where[field][op]=value`). Matches the
     shape `useDataTableUrlState` already writes, so the simple case stays
     interoperable with the per-column filter input.
   - Any OR group → emit indexed AND-array shape:
       where[and][0][alt][contains]=foo
       where[and][1][or][0][status][equals]=draft
       where[and][1][or][1][status][equals]=archived
     Payload's Where validator expects `and`/`or` as arrays; the extended
     parseWhere converts numeric-keyed branches back to arrays.

   Decoding handles either shape, and also tolerates mixed URLs (manual
   edits). On the next encode the URL re-normalizes. */

import type { FieldMeta } from '../columns/fieldPicker.js'

export type WhereOperator =
  | 'contains'
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'exists'

export type FilterValue = string | string[] | boolean | null

export type FilterChip = {
  id: string
  field: string
  operator: WhereOperator
  value: FilterValue
}

export type FilterGroup = {
  id: string
  op: 'or'
  chips: FilterChip[]
}

export type FilterNode =
  | { kind: 'chip'; chip: FilterChip }
  | { kind: 'group'; group: FilterGroup }

export type FilterState = {
  nodes: FilterNode[]
}

export const FILTER_STATE_SCHEMA_VERSION = 1

const SYNTHETIC_FILTERABLE = new Set(['id', 'createdAt', 'updatedAt'])

const FILTERABLE_TYPES = new Set([
  'text',
  'email',
  'textarea',
  'number',
  'date',
  'checkbox',
  'select',
  'radio',
  'relationship',
])

export type OperatorDescriptor = {
  value: WhereOperator
  /** Display token, NOT a finished string. Word tokens (`is`, `isNot`,
   *  `contains`, `isAnyOf`, `exists`, `in`, `after`, `before`, `on`) resolve to
   *  `shadcnAdmin:op*` translations via `resolveOperatorLabel`; symbol tokens
   *  (`=`, `≠`, `>`, `<`) pass through untranslated. Kept as a plain string so
   *  this codec stays a pure, i18n-free data module. */
  label: string
  /** When true, the chip value is an array (rendered as multi-select). */
  multi?: boolean
  /** When true, the value control is hidden (operator carries the meaning). */
  noValue?: boolean
}

/* Word-token → `shadcnAdmin` translation key. Tokens absent here (the symbol
   operators `=` `≠` `>` `<`) are universal and render verbatim. */
const OPERATOR_LABEL_KEYS: Record<string, string> = {
  is: 'shadcnAdmin:opIs',
  isNot: 'shadcnAdmin:opIsNot',
  contains: 'shadcnAdmin:opContains',
  isAnyOf: 'shadcnAdmin:opIsAnyOf',
  exists: 'shadcnAdmin:opExists',
  in: 'shadcnAdmin:opIn',
  after: 'shadcnAdmin:opAfter',
  before: 'shadcnAdmin:opBefore',
  on: 'shadcnAdmin:opOn',
}

/** Resolve an `OperatorDescriptor.label` token to its display string for the
 *  active admin language. `t` is the caller's translate fn (passed in so this
 *  module imports no `@payloadcms/ui`); symbol tokens pass through. */
export const resolveOperatorLabel = (
  token: string,
  t: (key: any, options?: any) => string,
): string => {
  const key = OPERATOR_LABEL_KEYS[token]
  return key ? t(key) : token
}

const OPERATORS_BY_FIELD_TYPE: Record<string, OperatorDescriptor[]> = {
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'isNot' },
  ],
  email: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'isNot' },
  ],
  textarea: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'isNot' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '≠' },
    { value: 'greater_than', label: '>' },
    { value: 'less_than', label: '<' },
  ],
  date: [
    { value: 'greater_than', label: 'after' },
    { value: 'less_than', label: 'before' },
    { value: 'equals', label: 'on' },
  ],
  checkbox: [{ value: 'equals', label: 'is' }],
  select: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'isNot' },
    { value: 'in', label: 'isAnyOf', multi: true },
  ],
  radio: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'isNot' },
    { value: 'in', label: 'isAnyOf', multi: true },
  ],
  relationship: [
    { value: 'equals', label: 'is' },
    { value: 'in', label: 'isAnyOf', multi: true },
    { value: 'exists', label: 'exists', noValue: true },
  ],
  id: [
    { value: 'equals', label: '=' },
    { value: 'in', label: 'in', multi: true },
  ],
}

export function operatorsForField(field: FieldMeta): OperatorDescriptor[] {
  const synthetic = field.name && SYNTHETIC_FILTERABLE.has(field.name)
  if (synthetic && field.name === 'id') return OPERATORS_BY_FIELD_TYPE.id
  if (synthetic) return OPERATORS_BY_FIELD_TYPE.date
  return OPERATORS_BY_FIELD_TYPE[field.type] ?? []
}

export function defaultOperatorForField(field: FieldMeta): WhereOperator {
  const ops = operatorsForField(field)
  return ops[0]?.value ?? 'equals'
}

export function isFilterable(field: FieldMeta): boolean {
  if (!field.name) return false
  if (SYNTHETIC_FILTERABLE.has(field.name)) return true
  if (field.hidden || field.admin?.hidden || field.admin?.disableListColumn) {
    return false
  }
  if (!FILTERABLE_TYPES.has(field.type)) return false
  // Polymorphic relationships render but are flagged separately so the UI
  // can disable them with a tooltip. See `isPolymorphicRelationship`.
  return true
}

export function isPolymorphicRelationship(field: FieldMeta): boolean {
  return field.type === 'relationship' && Array.isArray(field.relationTo)
}

let chipIdCounter = 0
const nextId = (prefix: string): string =>
  `${prefix}-${++chipIdCounter}-${Math.random().toString(36).slice(2, 7)}`

export const makeGroupId = (): string => nextId('group')

/* URL-derived chip IDs are deterministic from field+operator+occurrence so a
   keystroke in a chip's value Input doesn't remount the chip (which would
   drop focus). Two consecutive decodes of the same URL produce the same IDs.
   For a chip whose field+operator combination is unique, the ID is simply
   `c-${field}-${operator}`; subsequent chips on the same combo bump a counter
   suffix. Pending chips anticipate this same ID so promotion does NOT remount
   the chip — see `formatChipId` and `useFilterUrlState`. */
type IdGen = (field: string, operator: string) => string

export function formatChipId(
  field: string,
  operator: string,
  occurrence: number,
): string {
  return occurrence === 1
    ? `c-${field}-${operator}`
    : `c-${field}-${operator}-${occurrence}`
}

const makeIdGen = (): IdGen => {
  const counts = new Map<string, number>()
  return (field, operator) => {
    const key = `${field}-${operator}`
    const n = (counts.get(key) ?? 0) + 1
    counts.set(key, n)
    return formatChipId(field, operator, n)
  }
}

/* Count how many chips in a state have a given (field, operator). Used by
   the URL hook to anticipate a pending chip's eventual URL ID so it doesn't
   remount on promotion. */
export function countChipsForFieldOp(
  state: FilterState,
  field: string,
  operator: string,
): number {
  let n = 0
  for (const node of state.nodes) {
    if (node.kind === 'chip') {
      if (node.chip.field === field && node.chip.operator === operator) n += 1
    } else {
      for (const c of node.group.chips) {
        if (c.field === field && c.operator === operator) n += 1
      }
    }
  }
  return n
}

/* ─── Encode ─────────────────────────────────────────────────────────── */

const stateHasOrGroup = (state: FilterState): boolean =>
  state.nodes.some((n) => n.kind === 'group' && n.group.chips.length > 0)

const encodeValueAt = (
  params: URLSearchParams,
  basePath: string,
  chip: FilterChip,
): void => {
  const opKey = `${basePath}[${chip.operator}]`
  if (chip.operator === 'exists') {
    // value is boolean; encode 'true' or 'false'
    params.append(opKey, chip.value === false ? 'false' : 'true')
    return
  }
  if (chip.operator === 'in' || chip.operator === 'not_in') {
    const arr = Array.isArray(chip.value)
      ? chip.value
      : chip.value !== null && chip.value !== undefined && chip.value !== ''
        ? [String(chip.value)]
        : []
    for (const v of arr) params.append(`${opKey}[]`, String(v))
    return
  }
  if (typeof chip.value === 'boolean') {
    params.append(opKey, chip.value ? 'true' : 'false')
    return
  }
  if (chip.value === null || chip.value === undefined || chip.value === '') {
    // skip — empty chips don't write
    return
  }
  params.append(opKey, Array.isArray(chip.value) ? String(chip.value[0]) : String(chip.value))
}

const chipHasValue = (chip: FilterChip): boolean => {
  if (chip.operator === 'exists') return chip.value !== null
  if (chip.operator === 'in' || chip.operator === 'not_in') {
    return Array.isArray(chip.value) && chip.value.length > 0
  }
  if (typeof chip.value === 'boolean') return true
  return chip.value !== null && chip.value !== undefined && chip.value !== ''
}

/* Append the chip's URL keys onto `params` and remove any matching existing
   keys first via `clearFilterKeys`. */
export function applyStateToSearchParams(
  params: URLSearchParams,
  state: FilterState,
): void {
  clearFilterKeys(params)

  const usableNodes = state.nodes
    .map((n) => {
      if (n.kind === 'chip') return chipHasValue(n.chip) ? n : null
      const chips = n.group.chips.filter(chipHasValue)
      if (chips.length === 0) return null
      if (chips.length === 1) {
        return { kind: 'chip', chip: chips[0] } as FilterNode
      }
      return {
        kind: 'group',
        group: { ...n.group, chips },
      } as FilterNode
    })
    .filter((n): n is FilterNode => n !== null)

  const indexed = usableNodes.some((n) => n.kind === 'group')

  if (!indexed) {
    for (const node of usableNodes) {
      if (node.kind !== 'chip') continue
      encodeValueAt(params, `where[${node.chip.field}]`, node.chip)
    }
    return
  }

  usableNodes.forEach((node, i) => {
    if (node.kind === 'chip') {
      encodeValueAt(
        params,
        `where[and][${i}][${node.chip.field}]`,
        node.chip,
      )
    } else {
      node.group.chips.forEach((chip, j) => {
        encodeValueAt(
          params,
          `where[and][${i}][or][${j}][${chip.field}]`,
          chip,
        )
      })
    }
  })
}

/* Remove every key this codec might have written. Used before re-encoding. */
export function clearFilterKeys(params: URLSearchParams): void {
  const toDelete: string[] = []
  for (const k of params.keys()) {
    if (k.startsWith('where[') || k === 'where') toDelete.push(k)
  }
  for (const k of toDelete) params.delete(k)
}

/* ─── Decode ─────────────────────────────────────────────────────────── */

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const OPERATOR_NAMES = new Set<string>([
  'contains',
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'in',
  'not_in',
  'exists',
])

const looksLikeOperatorMap = (obj: Record<string, unknown>): boolean => {
  const keys = Object.keys(obj)
  if (keys.length === 0) return false
  return keys.every((k) => OPERATOR_NAMES.has(k))
}

const chipsFromFieldOperatorMap = (
  field: string,
  opMap: Record<string, unknown>,
  idGen: IdGen,
): FilterChip[] => {
  const out: FilterChip[] = []
  for (const [op, raw] of Object.entries(opMap)) {
    if (!OPERATOR_NAMES.has(op)) continue
    const operator = op as WhereOperator
    let value: FilterValue = null
    if (operator === 'exists') {
      value = raw === 'true' || raw === true
    } else if (operator === 'in' || operator === 'not_in') {
      if (Array.isArray(raw)) value = raw.map(String)
      else if (raw !== null && raw !== undefined) value = [String(raw)]
      else value = []
    } else if (raw !== null && raw !== undefined) {
      value = Array.isArray(raw) ? String(raw[0]) : String(raw)
    }
    out.push({ id: idGen(field, operator), field, operator, value })
  }
  return out
}

const chipsFromBranch = (branch: unknown, idGen: IdGen): FilterChip[] => {
  if (!isPlainObject(branch)) return []
  const out: FilterChip[] = []
  for (const [k, v] of Object.entries(branch)) {
    if (k === 'and' || k === 'or') continue
    if (!isPlainObject(v)) continue
    if (!looksLikeOperatorMap(v)) continue
    out.push(...chipsFromFieldOperatorMap(k, v, idGen))
  }
  return out
}

export function whereToState(where: unknown): FilterState {
  const nodes: FilterNode[] = []
  if (!isPlainObject(where)) return { nodes }

  // One IdGen instance per decode → IDs depend on encounter order in the URL,
  // which URLSearchParams preserves across writes (insertion order).
  const idGen = makeIdGen()
  // Group IDs are derived from their position so reorders don't drop state.
  let groupSeq = 0
  const nextGroupId = () => `g-${++groupSeq}`

  // Flat top-level chips (always read; some may coexist with `and`)
  for (const chip of chipsFromBranch(where, idGen)) {
    nodes.push({ kind: 'chip', chip })
  }

  const andArr = (where as { and?: unknown }).and
  if (Array.isArray(andArr)) {
    for (const entry of andArr) {
      if (!isPlainObject(entry)) continue
      const orArr = (entry as { or?: unknown }).or
      if (Array.isArray(orArr)) {
        const chips: FilterChip[] = []
        for (const inner of orArr) chips.push(...chipsFromBranch(inner, idGen))
        if (chips.length > 0) {
          nodes.push({
            kind: 'group',
            group: { id: nextGroupId(), op: 'or', chips },
          })
        }
        continue
      }
      for (const chip of chipsFromBranch(entry, idGen)) {
        nodes.push({ kind: 'chip', chip })
      }
    }
  }

  // Top-level `or` (rare but possible from a manually-edited URL)
  const orArr = (where as { or?: unknown }).or
  if (Array.isArray(orArr)) {
    const chips: FilterChip[] = []
    for (const inner of orArr) chips.push(...chipsFromBranch(inner, idGen))
    if (chips.length > 0) {
      nodes.push({
        kind: 'group',
        group: { id: nextGroupId(), op: 'or', chips },
      })
    }
  }

  return { nodes }
}

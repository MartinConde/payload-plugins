'use client'

/* Stateless field-render layer shared by the Account view and the
   Create-First-User view. It mirrors AutoDocFormBridge's renderField /
   renderChild dispatch (labels, required marker, read/update gating, group /
   tabs / row / collapsible structural walking, array/blocks via FieldInput's
   renderChild) but owns NO state — the caller passes `values`/`errors` and
   receives changes via `onChange(path, value)`. richText and localization are
   out of scope here (Account / first-user forms don't surface them); a
   richText leaf simply renders FieldInput's fallback.

   This deliberately duplicates the bridge's compact dispatch rather than
   refactoring the bridge, so the per-collection doc view stays untouched. */

import * as React from 'react'
import { LockIcon } from 'lucide-react'

import { FieldInput } from '../doc-form/inputs/FieldInput.js'
import {
  GroupSection,
  TabsSection,
} from '../doc-form/structuralRenderers.js'
import {
  canRead,
  canUpdate,
  isFieldVisible,
  subPerms,
  type Perms,
} from '../doc-form/access-control/fieldPermissions.js'
import type { ExtractedField } from 'payload-plugin-shadcn-ui'

const PLUGIN_NAMESPACE = 'plugin-shadcn-admin'

const labelOf = (field: ExtractedField): string =>
  field.label && field.label.length > 0 ? field.label : (field.name ?? '')

const SYSTEM_FIELD_NAMES = new Set([
  'id',
  'createdAt',
  'updatedAt',
  '_status',
  'salt',
  'hash',
  'sessions',
  'loginAttempts',
  'lockUntil',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'enableAPIKey',
  'apiKey',
  'apiKeyIndex',
  '_verified',
  '_verificationToken',
])

const isFieldRenderable = (field: ExtractedField): boolean => {
  if (!field.name) return false
  if (SYSTEM_FIELD_NAMES.has(field.name)) return false
  if (field.admin?.hidden) return false
  if (field.admin?.disabled) return false
  if (field.hidden === true) return false
  const hideInDocForm = (field.custom?.[PLUGIN_NAMESPACE] as
    | { hideInDocForm?: boolean }
    | undefined)?.hideInDocForm
  if (hideInDocForm) return false
  return true
}

const TRANSPARENT_STRUCTURAL = new Set(['row', 'collapsible', 'group', 'tabs'])
const isRenderableHere = (field: ExtractedField): boolean =>
  TRANSPARENT_STRUCTURAL.has(field.type) || isFieldRenderable(field)

const parsePathSegments = (path: string): (string | number)[] =>
  path
    .split('.')
    .filter((s) => s.length > 0)
    .map((seg) => {
      const n = Number(seg)
      return Number.isInteger(n) && String(n) === seg ? n : seg
    })

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export const getByPath = (root: unknown, path: string): unknown => {
  let cur: unknown = root
  for (const seg of parsePathSegments(path)) {
    if (cur === null || cur === undefined) return undefined
    if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return undefined
      cur = (cur as unknown[])[seg]
    } else {
      if (!isObject(cur)) return undefined
      cur = cur[seg]
    }
  }
  return cur
}

/** Immutably set `value` at a dotted path, cloning only the touched spine. */
export const setByPath = (
  root: Record<string, unknown>,
  path: string,
  next: unknown,
): Record<string, unknown> => {
  const segs = parsePathSegments(path)
  if (segs.length === 0) return root
  const out: Record<string, unknown> = { ...root }
  let parent: any = out
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]
    const childExpectsArray = typeof segs[i + 1] === 'number'
    let child = parent[seg]
    if (childExpectsArray) child = Array.isArray(child) ? [...child] : []
    else child = isObject(child) ? { ...child } : {}
    parent[seg] = child
    parent = child
  }
  parent[segs[segs.length - 1]] = next
  return out
}

export type FieldListProps = {
  fields: ExtractedField[]
  values: Record<string, unknown>
  errors: Record<string, string>
  onChange: (path: string, value: unknown) => void
  useAsTitleBySlug: Record<string, string | undefined>
  docPermissions?: Perms
  disabled?: boolean
  operation?: 'create' | 'update'
}

export function FieldList({
  fields,
  values,
  errors,
  onChange,
  useAsTitleBySlug,
  docPermissions,
  disabled,
  operation = 'update',
}: FieldListProps): React.ReactElement {
  const renderField = (
    field: ExtractedField,
    pathPrefix: string,
    parentPerms?: Perms,
  ): React.ReactNode => {
    if (!field.name) return null
    if (!isFieldRenderable(field)) return null
    if (!canRead(parentPerms, field.name)) return null
    const path = `${pathPrefix}${field.name}`
    const error = errors[path]
    const description = field.admin?.description
    const isReadOnly = !canUpdate(parentPerms, field.name)
    return (
      <div key={path} className="flex flex-col gap-1.5">
        <label
          htmlFor={`account-${path}`}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground"
        >
          <span>{labelOf(field)}</span>
          {field.required ? (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
          {field.hasMany ? (
            <span className="text-xs text-muted-foreground">(multiple)</span>
          ) : null}
          {isReadOnly ? (
            <LockIcon
              className="size-3 text-muted-foreground"
              aria-label="Read-only — you do not have permission to update this field"
            />
          ) : null}
        </label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
        <FieldInput
          field={field as never}
          value={getByPath(values, path)}
          useAsTitleBySlug={useAsTitleBySlug}
          onChange={(next) => onChange(path, next)}
          id={`account-${path}`}
          required={field.required}
          invalid={Boolean(error)}
          disabled={disabled || isReadOnly}
          nestedPath={path}
          renderChild={renderChild}
          operation={operation}
          fieldPerms={subPerms(parentPerms, field.name)}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    )
  }

  const renderChild = (
    child: ExtractedField,
    pathPrefix: string,
    parentPerms?: Perms,
  ): React.ReactNode => {
    if (!isFieldVisible(child, parentPerms)) return null
    if (child.type === 'row') {
      const children = (child.fields ?? []).filter(
        (c) => isRenderableHere(c) && isFieldVisible(c, parentPerms),
      )
      if (children.length === 0) return null
      return (
        <div
          key={`row:${pathPrefix}:${children.map((c) => c.name ?? c.type).join('|')}`}
          className="flex flex-row flex-wrap gap-4"
        >
          {children.map((c, i) => (
            <div key={c.name ?? `_${c.type}_${i}`} className="min-w-[200px] flex-1">
              {renderChild(c, pathPrefix, parentPerms)}
            </div>
          ))}
        </div>
      )
    }
    if (child.type === 'collapsible') {
      const children = (child.fields ?? []).filter(
        (c) => isRenderableHere(c) && isFieldVisible(c, parentPerms),
      )
      if (children.length === 0) return null
      return (
        <div key={`collapsible:${pathPrefix}`} className="flex flex-col gap-4 rounded-md border p-3">
          {children.map((c) => renderChild(c, pathPrefix, parentPerms))}
        </div>
      )
    }
    if (child.type === 'group') {
      if (!child.name) return null
      return (
        <GroupSection
          key={`group-${pathPrefix}${child.name}`}
          field={child}
          pathPrefix={`${pathPrefix}${child.name}.`}
          parentPerms={parentPerms}
          renderChild={renderChild}
        />
      )
    }
    if (child.type === 'tabs') {
      return (
        <TabsSection
          key={`tabs-${pathPrefix}${child.name ?? 't'}`}
          field={child}
          pathPrefix={pathPrefix}
          parentPerms={parentPerms}
          renderChild={renderChild}
        />
      )
    }
    return renderField(child, pathPrefix, parentPerms)
  }

  const visibleTopLevel = fields.filter(isRenderableHere)

  return (
    <div className="flex flex-col gap-4">
      {visibleTopLevel.map((f) => renderChild(f, '', docPermissions))}
    </div>
  )
}

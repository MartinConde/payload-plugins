'use client'

/* Shared field-tree recursion. Extracted from AutoDocFormBridge so both the
   doc form and the list-view bulk-edit drawer render every field type through
   the exact same path — no second field-editor matrix.

   `makeFieldTreeRenderer(deps)` returns `{ renderField, renderChild }`, the two
   mutually-recursive functions the bridge used to define inline:
   - `renderField` renders one leaf (incl. array/blocks/upload/richText, which
     are leaves from the recursion's POV — they self-render rows via the
     `renderChild` callback passed through FieldInput).
   - `renderChild` dispatches any node at any depth: flattens row/collapsible,
     hands group/tabs to the structural renderers, falls through to renderField.

   The bridge owns its values/dirty/locale state and passes the read side in as
   `deps`; the write side is the single `setValueAtPath(path, next)` callback.
   The bulk drawer wires the same shape against a local values shim. */

import * as React from 'react'
import { LockIcon } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'payload-plugin-shadcn-ui'
import { FieldInput } from '../inputs/FieldInput.js'
import { GroupSection, TabsSection } from '../structuralRenderers.js'
import type {
  ExtractedCollection,
  ExtractedField,
} from 'payload-plugin-shadcn-ui'
import {
  canCreate,
  canRead,
  canUpdate,
  isFieldVisible,
  subPerms,
  type Perms,
} from '../access-control/fieldPermissions.js'
import type { RichTextRenderedMap } from '../richtext/extractRichTextRenderedFields.js'
import {
  getByPath,
  isObject,
  isFieldRenderable,
  isRenderableHere,
  labelOf,
} from './sharedHelpers.js'

export type FieldTreeDeps = {
  /** Doc-root value tree. Localized leaves hold `{locale: value}` objects. */
  values: Record<string, unknown>
  /** Path-keyed inline error messages. */
  errors: Record<string, string>
  /** Active locale, or null when localization is off. */
  activeLocale: string | null
  localizationEnabled: boolean
  /** Disables every input (e.g. while submitting). */
  disabled: boolean
  /** Single write seam: replace the value at a dotted path. */
  setValueAtPath: (path: string, next: unknown) => void
  /** Pre-rendered Payload richText Field elements, keyed by dotted path. */
  richTextRendered: RichTextRenderedMap
  useAsTitleBySlug: Record<string, string | undefined>
  /** Serializable metadata for every upload collection, keyed by slug.
   *  Forwarded to FieldInput → UploadFieldInput for the custom upload dialog. */
  uploadCollectionsBySlug?: Record<string, ExtractedCollection>
  operation: 'create' | 'update'
  /** Class applied to each leaf wrapper. Defaults to a stacked column. */
  fieldWrapperClassName?: string
  /** When true, render the field label + required marker + lock icon. The
   *  bulk drawer renders its own chrome and sets this false. */
  showFieldChrome?: boolean
  /** Prefix for the per-input DOM id (e.g. `doc-form-` / `bulk-edit-`). */
  idPrefix?: string
}

export type FieldTreeRenderer = {
  renderField: (
    field: ExtractedField,
    pathPrefix: string,
    parentPerms?: Perms,
    /** Forces this field (and its inputs) read-only regardless of access —
     *  set when a parent container is read-only so it cascades to children. */
    inheritedReadOnly?: boolean,
  ) => React.ReactNode
  renderChild: (
    child: ExtractedField,
    pathPrefix: string,
    parentPerms?: Perms,
    inheritedReadOnly?: boolean,
  ) => React.ReactNode
}

export function makeFieldTreeRenderer(deps: FieldTreeDeps): FieldTreeRenderer {
  const {
    values,
    errors,
    activeLocale,
    localizationEnabled,
    disabled,
    setValueAtPath,
    richTextRendered,
    useAsTitleBySlug,
    uploadCollectionsBySlug,
    operation,
    fieldWrapperClassName = 'flex flex-col gap-1.5',
    showFieldChrome = true,
    idPrefix = 'doc-form-',
  } = deps

  // Render a single leaf field, with optional nested path prefix.
  // `parentPerms` is the FieldPermissions of the parent container
  // (`docPermissions` at the top level). The field's own perms are looked up
  // via `subPerms(parentPerms, field.name)` and forwarded as `fieldPerms`
  // (used by array/blocks to gate row subfields).
  const renderField = (
    field: ExtractedField,
    pathPrefix: string,
    parentPerms?: Perms,
    inheritedReadOnly = false,
  ): React.ReactNode => {
    if (!field.name) return null
    if (!isFieldRenderable(field) && !field.name.startsWith('__')) return null
    // Read gate. Synthesized fields bypass perms.
    if (!field.name.startsWith('__') && !canRead(parentPerms, field.name)) {
      return null
    }
    const path = `${pathPrefix}${field.name}`
    const error = errors[path]
    const description = field.admin?.description
    const rawFieldValue = getByPath(values, path)
    // A localized array/blocks field stores its rows under a locale-keyed
    // object (`values.layout = {en: [...]}`). Its rows render from the
    // active-locale slice (`fieldValue` below), so the CHILD base path must
    // include the locale too — otherwise `breadcrumbs.0.url` would resolve
    // against the locale object and read/write `undefined`. The field's own
    // value (projected) and onChange (which merges into the locale-keyed object
    // via `setValueAtPath`) stay on the bare `path`.
    const childBasePath =
      field.localized &&
      localizationEnabled &&
      activeLocale &&
      (field.type === 'array' || field.type === 'blocks')
        ? `${path}.${activeLocale}`
        : path
    // For localized leaves, FieldInput receives the active-locale slice. The
    // locale-keyed object stays in `values` so other locales' edits survive.
    const fieldValue =
      field.localized && localizationEnabled && activeLocale
        ? isObject(rawFieldValue)
          ? rawFieldValue[activeLocale]
          : rawFieldValue
        : rawFieldValue
    // Write gate. Payload enforces `access.create` on create operations and
    // `access.update` on update operations, so we consult the op that matches
    // the current form operation (v3.18 — extends v3.7's update-only gate to
    // honor `access.create` in create mode). Synthesized fields are always
    // writable. For array/blocks containers this `disabled` cascades through
    // FieldInput → ArrayInput/BlocksInput to gate the add/remove/reorder
    // controls — no per-control gating needed (Payload has no per-row grant).
    const isReadOnly =
      inheritedReadOnly ||
      Boolean(field.admin?.readOnly) ||
      (!field.name.startsWith('__') &&
        (operation === 'create'
          ? !canCreate(parentPerms, field.name)
          : !canUpdate(parentPerms, field.name)))
    return (
      // `data-field-path` is the stable scroll target for validation errors —
      // it's present on every field wrapper, including richText (whose inner
      // input is Payload's pre-rendered element with its own id, so the
      // `${idPrefix}${path}` id doesn't exist there). See focusFirstError.
      <div key={path} data-field-path={path} className={fieldWrapperClassName}>
        {showFieldChrome && !field.hideLabel ? (
          <label
            htmlFor={`${idPrefix}${path}`}
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
                aria-label={
                  operation === 'create'
                    ? 'Read-only — you do not have permission to create this field'
                    : 'Read-only — you do not have permission to update this field'
                }
              />
            ) : null}
          </label>
        ) : null}
        {showFieldChrome && description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
        <FieldInput
          field={field as any}
          value={fieldValue}
          useAsTitleBySlug={useAsTitleBySlug}
          uploadCollectionsBySlug={uploadCollectionsBySlug}
          onChange={(next) => setValueAtPath(path, next)}
          id={`${idPrefix}${path}`}
          required={field.required}
          invalid={Boolean(error)}
          disabled={disabled || isReadOnly}
          nestedPath={childBasePath}
          renderChild={renderChild}
          activeLocale={activeLocale}
          richTextRendered={
            field.type === 'richText' ? richTextRendered[path] : undefined
          }
          operation={operation}
          fieldPerms={subPerms(parentPerms, field.name)}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    )
  }

  // Dispatch one node (any depth). Flattens row/collapsible, dispatches
  // group/tabs to structuralRenderers, and falls through to renderField for
  // leaves (and array/blocks, which are leaves from the recursion's POV — they
  // self-render rows via the renderChild callback passed through FieldInput).
  // parentPerms threads through every recursion; transparent structurals (row,
  // collapsible) share parent perms; group derives sub perms; tabs handled
  // inside TabsSection.
  const renderChild = (
    child: ExtractedField,
    pathPrefix: string,
    parentPerms?: Perms,
    inheritedReadOnly = false,
  ): React.ReactNode => {
    // A `ui` field is presentational (no data, not in `docPermissions`, and
    // outside the doc-form support matrix). We render one ONLY when it carries
    // a `custom['plugin-shadcn-admin'].input` override — Payload's idiomatic
    // "vessel for a custom component". It renders bare (no label/description
    // chrome) and bypasses the visibility/perm gates, which target data fields.
    // A `ui` field without our override is skipped silently (not an error).
    if (child.type === 'ui') {
      const uiOverride = (child.custom?.['plugin-shadcn-admin'] as
        | { input?: unknown }
        | undefined)?.input
      if (!uiOverride || !child.name) return null
      const uiPath = `${pathPrefix}${child.name}`
      return (
        <div key={`ui:${uiPath}`} data-field-path={uiPath}>
          <FieldInput
            field={child as never}
            value={undefined}
            useAsTitleBySlug={useAsTitleBySlug}
            uploadCollectionsBySlug={uploadCollectionsBySlug}
            onChange={() => {}}
            id={`${idPrefix}${uiPath}`}
            nestedPath={uiPath}
            renderChild={renderChild}
            activeLocale={activeLocale}
            operation={operation}
            fieldPerms={undefined}
          />
        </div>
      )
    }
    // Recursive visibility for hide-empty-containers UX.
    if (!isFieldVisible(child, parentPerms)) return null
    if (child.type === 'row') {
      const children = (child.fields ?? []).filter(
        (c) => isRenderableHere(c) && isFieldVisible(c, parentPerms),
      )
      if (children.length === 0) return null
      const stableSuffix = children
        .map((c) => c.name ?? `_${c.type}`)
        .join('|')
      return (
        <div
          key={`row:${pathPrefix}:${stableSuffix}`}
          className="flex flex-row flex-wrap gap-4"
        >
          {children.map((c, i) => (
            <div
              key={c.name ?? `_${c.type}_${i}`}
              className="flex-1 min-w-[200px]"
            >
              {renderChild(c, pathPrefix, parentPerms, inheritedReadOnly)}
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
      const label = child.collapsibleLabel ?? child.label ?? 'Details'
      const stableSuffix = children
        .map((c) => c.name ?? `_${c.type}`)
        .join('|')
      return (
        <Collapsible
          key={`collapsible:${pathPrefix}:${stableSuffix}`}
          defaultOpen
          className="rounded-md border"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              <span>{label}</span>
              <span className="text-xs text-muted-foreground">Toggle</span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-4 border-t px-3 py-3">
            {children.map((c) =>
              renderChild(c, pathPrefix, parentPerms, inheritedReadOnly),
            )}
          </CollapsibleContent>
        </Collapsible>
      )
    }
    // A group/tabs field may opt out of the structural renderer by carrying a
    // `custom['plugin-shadcn-admin'].input` override (the same escape hatch
    // leaf fields use). Routing it through renderField hands the override the
    // whole container value (live) plus `renderChild`, so it can render its own
    // chrome (e.g. a SEO SERP preview) and delegate the real subfield inputs
    // back through the bridge. renderField bails on nameless fields, so an
    // unnamed tabs override is a no-op — name your container to use this.
    const containerOverride = (child.custom?.['plugin-shadcn-admin'] as
      | { input?: unknown }
      | undefined)?.input
    if (
      containerOverride &&
      (child.type === 'group' || child.type === 'tabs')
    ) {
      return renderField(child, pathPrefix, parentPerms, inheritedReadOnly)
    }
    if (child.type === 'group') {
      if (!child.name) return null
      const groupPrefix = `${pathPrefix}${child.name}.`
      return (
        <GroupSection
          key={`group-${groupPrefix}`}
          field={child}
          pathPrefix={groupPrefix}
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
    return renderField(child, pathPrefix, parentPerms, inheritedReadOnly)
  }

  return { renderField, renderChild }
}

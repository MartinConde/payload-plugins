'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
   The bulk drawer wires the same shape against a local values shim. */ import * as React from 'react';
import { LockIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'payload-plugin-shadcn-ui';
import { FieldInput } from '../inputs/FieldInput.js';
import { GroupSection, TabsSection } from '../structuralRenderers.js';
import { canCreate, canRead, canUpdate, isFieldVisible, subPerms } from '../access-control/fieldPermissions.js';
import { getByPath, isObject, isFieldRenderable, isRenderableHere, labelOf } from './sharedHelpers.js';
export function makeFieldTreeRenderer(deps) {
    const { values, errors, activeLocale, localizationEnabled, disabled, setValueAtPath, richTextRendered, useAsTitleBySlug, uploadCollectionsBySlug, operation, fieldWrapperClassName = 'flex flex-col gap-1.5', showFieldChrome = true, idPrefix = 'doc-form-' } = deps;
    // Render a single leaf field, with optional nested path prefix.
    // `parentPerms` is the FieldPermissions of the parent container
    // (`docPermissions` at the top level). The field's own perms are looked up
    // via `subPerms(parentPerms, field.name)` and forwarded as `fieldPerms`
    // (used by array/blocks to gate row subfields).
    const renderField = (field, pathPrefix, parentPerms, inheritedReadOnly = false)=>{
        if (!field.name) return null;
        if (!isFieldRenderable(field) && !field.name.startsWith('__')) return null;
        // Read gate. Synthesized fields bypass perms.
        if (!field.name.startsWith('__') && !canRead(parentPerms, field.name)) {
            return null;
        }
        const path = `${pathPrefix}${field.name}`;
        const error = errors[path];
        const description = field.admin?.description;
        const rawFieldValue = getByPath(values, path);
        // A localized array/blocks field stores its rows under a locale-keyed
        // object (`values.layout = {en: [...]}`). Its rows render from the
        // active-locale slice (`fieldValue` below), so the CHILD base path must
        // include the locale too — otherwise `breadcrumbs.0.url` would resolve
        // against the locale object and read/write `undefined`. The field's own
        // value (projected) and onChange (which merges into the locale-keyed object
        // via `setValueAtPath`) stay on the bare `path`.
        const childBasePath = field.localized && localizationEnabled && activeLocale && (field.type === 'array' || field.type === 'blocks') ? `${path}.${activeLocale}` : path;
        // For localized leaves, FieldInput receives the active-locale slice. The
        // locale-keyed object stays in `values` so other locales' edits survive.
        const fieldValue = field.localized && localizationEnabled && activeLocale ? isObject(rawFieldValue) ? rawFieldValue[activeLocale] : rawFieldValue : rawFieldValue;
        // Write gate. Payload enforces `access.create` on create operations and
        // `access.update` on update operations, so we consult the op that matches
        // the current form operation (v3.18 — extends v3.7's update-only gate to
        // honor `access.create` in create mode). Synthesized fields are always
        // writable. For array/blocks containers this `disabled` cascades through
        // FieldInput → ArrayInput/BlocksInput to gate the add/remove/reorder
        // controls — no per-control gating needed (Payload has no per-row grant).
        const isReadOnly = inheritedReadOnly || Boolean(field.admin?.readOnly) || !field.name.startsWith('__') && (operation === 'create' ? !canCreate(parentPerms, field.name) : !canUpdate(parentPerms, field.name));
        return(// `data-field-path` is the stable scroll target for validation errors —
        // it's present on every field wrapper, including richText (whose inner
        // input is Payload's pre-rendered element with its own id, so the
        // `${idPrefix}${path}` id doesn't exist there). See focusFirstError.
        /*#__PURE__*/ _jsxs("div", {
            "data-field-path": path,
            className: fieldWrapperClassName,
            children: [
                showFieldChrome && !field.hideLabel ? /*#__PURE__*/ _jsxs("label", {
                    htmlFor: `${idPrefix}${path}`,
                    className: "flex items-center gap-1.5 text-sm font-medium text-foreground",
                    children: [
                        /*#__PURE__*/ _jsx("span", {
                            children: labelOf(field)
                        }),
                        field.required ? /*#__PURE__*/ _jsx("span", {
                            className: "text-destructive",
                            "aria-hidden": "true",
                            children: "*"
                        }) : null,
                        field.hasMany ? /*#__PURE__*/ _jsx("span", {
                            className: "text-xs text-muted-foreground",
                            children: "(multiple)"
                        }) : null,
                        isReadOnly ? /*#__PURE__*/ _jsx(LockIcon, {
                            className: "size-3 text-muted-foreground",
                            "aria-label": operation === 'create' ? 'Read-only — you do not have permission to create this field' : 'Read-only — you do not have permission to update this field'
                        }) : null
                    ]
                }) : null,
                showFieldChrome && description ? /*#__PURE__*/ _jsx("p", {
                    className: "text-xs text-muted-foreground",
                    children: description
                }) : null,
                /*#__PURE__*/ _jsx(FieldInput, {
                    field: field,
                    value: fieldValue,
                    useAsTitleBySlug: useAsTitleBySlug,
                    uploadCollectionsBySlug: uploadCollectionsBySlug,
                    onChange: (next)=>setValueAtPath(path, next),
                    id: `${idPrefix}${path}`,
                    required: field.required,
                    invalid: Boolean(error),
                    disabled: disabled || isReadOnly,
                    nestedPath: childBasePath,
                    renderChild: renderChild,
                    activeLocale: activeLocale,
                    richTextRendered: field.type === 'richText' ? richTextRendered[path] : undefined,
                    operation: operation,
                    fieldPerms: subPerms(parentPerms, field.name)
                }),
                error ? /*#__PURE__*/ _jsx("p", {
                    className: "text-xs text-destructive",
                    children: error
                }) : null
            ]
        }, path));
    };
    // Dispatch one node (any depth). Flattens row/collapsible, dispatches
    // group/tabs to structuralRenderers, and falls through to renderField for
    // leaves (and array/blocks, which are leaves from the recursion's POV — they
    // self-render rows via the renderChild callback passed through FieldInput).
    // parentPerms threads through every recursion; transparent structurals (row,
    // collapsible) share parent perms; group derives sub perms; tabs handled
    // inside TabsSection.
    const renderChild = (child, pathPrefix, parentPerms, inheritedReadOnly = false)=>{
        // A `ui` field is presentational (no data, not in `docPermissions`, and
        // outside the doc-form support matrix). We render one ONLY when it carries
        // a `custom['plugin-shadcn-admin'].input` override — Payload's idiomatic
        // "vessel for a custom component". It renders bare (no label/description
        // chrome) and bypasses the visibility/perm gates, which target data fields.
        // A `ui` field without our override is skipped silently (not an error).
        if (child.type === 'ui') {
            const uiOverride = child.custom?.['plugin-shadcn-admin']?.input;
            if (!uiOverride || !child.name) return null;
            const uiPath = `${pathPrefix}${child.name}`;
            return /*#__PURE__*/ _jsx("div", {
                "data-field-path": uiPath,
                children: /*#__PURE__*/ _jsx(FieldInput, {
                    field: child,
                    value: undefined,
                    useAsTitleBySlug: useAsTitleBySlug,
                    uploadCollectionsBySlug: uploadCollectionsBySlug,
                    onChange: ()=>{},
                    id: `${idPrefix}${uiPath}`,
                    nestedPath: uiPath,
                    renderChild: renderChild,
                    activeLocale: activeLocale,
                    operation: operation,
                    fieldPerms: undefined
                })
            }, `ui:${uiPath}`);
        }
        // Recursive visibility for hide-empty-containers UX.
        if (!isFieldVisible(child, parentPerms)) return null;
        if (child.type === 'row') {
            const children = (child.fields ?? []).filter((c)=>isRenderableHere(c) && isFieldVisible(c, parentPerms));
            if (children.length === 0) return null;
            const stableSuffix = children.map((c)=>c.name ?? `_${c.type}`).join('|');
            return /*#__PURE__*/ _jsx("div", {
                className: "flex flex-row flex-wrap gap-4",
                children: children.map((c, i)=>/*#__PURE__*/ _jsx("div", {
                        className: "flex-1 min-w-[200px]",
                        children: renderChild(c, pathPrefix, parentPerms, inheritedReadOnly)
                    }, c.name ?? `_${c.type}_${i}`))
            }, `row:${pathPrefix}:${stableSuffix}`);
        }
        if (child.type === 'collapsible') {
            const children = (child.fields ?? []).filter((c)=>isRenderableHere(c) && isFieldVisible(c, parentPerms));
            if (children.length === 0) return null;
            const label = child.collapsibleLabel ?? child.label ?? 'Details';
            const stableSuffix = children.map((c)=>c.name ?? `_${c.type}`).join('|');
            return /*#__PURE__*/ _jsxs(Collapsible, {
                defaultOpen: true,
                className: "rounded-md border",
                children: [
                    /*#__PURE__*/ _jsx(CollapsibleTrigger, {
                        asChild: true,
                        children: /*#__PURE__*/ _jsxs("button", {
                            type: "button",
                            className: "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50",
                            children: [
                                /*#__PURE__*/ _jsx("span", {
                                    children: label
                                }),
                                /*#__PURE__*/ _jsx("span", {
                                    className: "text-xs text-muted-foreground",
                                    children: "Toggle"
                                })
                            ]
                        })
                    }),
                    /*#__PURE__*/ _jsx(CollapsibleContent, {
                        className: "flex flex-col gap-4 border-t px-3 py-3",
                        children: children.map((c)=>renderChild(c, pathPrefix, parentPerms, inheritedReadOnly))
                    })
                ]
            }, `collapsible:${pathPrefix}:${stableSuffix}`);
        }
        // A group/tabs field may opt out of the structural renderer by carrying a
        // `custom['plugin-shadcn-admin'].input` override (the same escape hatch
        // leaf fields use). Routing it through renderField hands the override the
        // whole container value (live) plus `renderChild`, so it can render its own
        // chrome (e.g. a SEO SERP preview) and delegate the real subfield inputs
        // back through the bridge. renderField bails on nameless fields, so an
        // unnamed tabs override is a no-op — name your container to use this.
        const containerOverride = child.custom?.['plugin-shadcn-admin']?.input;
        if (containerOverride && (child.type === 'group' || child.type === 'tabs')) {
            return renderField(child, pathPrefix, parentPerms, inheritedReadOnly);
        }
        if (child.type === 'group') {
            if (!child.name) return null;
            const groupPrefix = `${pathPrefix}${child.name}.`;
            return /*#__PURE__*/ _jsx(GroupSection, {
                field: child,
                pathPrefix: groupPrefix,
                parentPerms: parentPerms,
                renderChild: renderChild
            }, `group-${groupPrefix}`);
        }
        if (child.type === 'tabs') {
            return /*#__PURE__*/ _jsx(TabsSection, {
                field: child,
                pathPrefix: pathPrefix,
                parentPerms: parentPerms,
                renderChild: renderChild
            }, `tabs-${pathPrefix}${child.name ?? 't'}`);
        }
        return renderField(child, pathPrefix, parentPerms, inheritedReadOnly);
    };
    return {
        renderField,
        renderChild
    };
}

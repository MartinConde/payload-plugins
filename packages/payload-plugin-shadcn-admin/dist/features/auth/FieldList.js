'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Stateless field-render layer shared by the Account view and the
   Create-First-User view. It mirrors AutoDocFormBridge's renderField /
   renderChild dispatch (labels, required marker, read/update gating, group /
   tabs / row / collapsible structural walking, array/blocks via FieldInput's
   renderChild) but owns NO state — the caller passes `values`/`errors` and
   receives changes via `onChange(path, value)`. richText and localization are
   out of scope here (Account / first-user forms don't surface them); a
   richText leaf simply renders FieldInput's fallback.

   This deliberately duplicates the bridge's compact dispatch rather than
   refactoring the bridge, so the per-collection doc view stays untouched. */ import * as React from 'react';
import { LockIcon } from 'lucide-react';
import { FieldInput } from '../doc-form/inputs/FieldInput.js';
import { GroupSection, TabsSection } from '../doc-form/structuralRenderers.js';
import { canRead, canUpdate, isFieldVisible, subPerms } from '../doc-form/access-control/fieldPermissions.js';
const PLUGIN_NAMESPACE = 'plugin-shadcn-admin';
const labelOf = (field)=>field.label && field.label.length > 0 ? field.label : field.name ?? '';
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
    '_verificationToken'
]);
const isFieldRenderable = (field)=>{
    if (!field.name) return false;
    if (SYSTEM_FIELD_NAMES.has(field.name)) return false;
    if (field.admin?.hidden) return false;
    if (field.admin?.disabled) return false;
    if (field.hidden === true) return false;
    const hideInDocForm = field.custom?.[PLUGIN_NAMESPACE]?.hideInDocForm;
    if (hideInDocForm) return false;
    return true;
};
const TRANSPARENT_STRUCTURAL = new Set([
    'row',
    'collapsible',
    'group',
    'tabs'
]);
const isRenderableHere = (field)=>TRANSPARENT_STRUCTURAL.has(field.type) || isFieldRenderable(field);
const parsePathSegments = (path)=>path.split('.').filter((s)=>s.length > 0).map((seg)=>{
        const n = Number(seg);
        return Number.isInteger(n) && String(n) === seg ? n : seg;
    });
const isObject = (v)=>typeof v === 'object' && v !== null && !Array.isArray(v);
export const getByPath = (root, path)=>{
    let cur = root;
    for (const seg of parsePathSegments(path)){
        if (cur === null || cur === undefined) return undefined;
        if (typeof seg === 'number') {
            if (!Array.isArray(cur)) return undefined;
            cur = cur[seg];
        } else {
            if (!isObject(cur)) return undefined;
            cur = cur[seg];
        }
    }
    return cur;
};
/** Immutably set `value` at a dotted path, cloning only the touched spine. */ export const setByPath = (root, path, next)=>{
    const segs = parsePathSegments(path);
    if (segs.length === 0) return root;
    const out = {
        ...root
    };
    let parent = out;
    for(let i = 0; i < segs.length - 1; i++){
        const seg = segs[i];
        const childExpectsArray = typeof segs[i + 1] === 'number';
        let child = parent[seg];
        if (childExpectsArray) child = Array.isArray(child) ? [
            ...child
        ] : [];
        else child = isObject(child) ? {
            ...child
        } : {};
        parent[seg] = child;
        parent = child;
    }
    parent[segs[segs.length - 1]] = next;
    return out;
};
export function FieldList({ fields, values, errors, onChange, useAsTitleBySlug, docPermissions, disabled, operation = 'update' }) {
    const renderField = (field, pathPrefix, parentPerms)=>{
        if (!field.name) return null;
        if (!isFieldRenderable(field)) return null;
        if (!canRead(parentPerms, field.name)) return null;
        const path = `${pathPrefix}${field.name}`;
        const error = errors[path];
        const description = field.admin?.description;
        const isReadOnly = !canUpdate(parentPerms, field.name);
        return /*#__PURE__*/ _jsxs("div", {
            className: "flex flex-col gap-1.5",
            children: [
                /*#__PURE__*/ _jsxs("label", {
                    htmlFor: `account-${path}`,
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
                            "aria-label": "Read-only — you do not have permission to update this field"
                        }) : null
                    ]
                }),
                description ? /*#__PURE__*/ _jsx("p", {
                    className: "text-xs text-muted-foreground",
                    children: description
                }) : null,
                /*#__PURE__*/ _jsx(FieldInput, {
                    field: field,
                    value: getByPath(values, path),
                    useAsTitleBySlug: useAsTitleBySlug,
                    onChange: (next)=>onChange(path, next),
                    id: `account-${path}`,
                    required: field.required,
                    invalid: Boolean(error),
                    disabled: disabled || isReadOnly,
                    nestedPath: path,
                    renderChild: renderChild,
                    operation: operation,
                    fieldPerms: subPerms(parentPerms, field.name)
                }),
                error ? /*#__PURE__*/ _jsx("p", {
                    className: "text-xs text-destructive",
                    children: error
                }) : null
            ]
        }, path);
    };
    const renderChild = (child, pathPrefix, parentPerms)=>{
        if (!isFieldVisible(child, parentPerms)) return null;
        if (child.type === 'row') {
            const children = (child.fields ?? []).filter((c)=>isRenderableHere(c) && isFieldVisible(c, parentPerms));
            if (children.length === 0) return null;
            return /*#__PURE__*/ _jsx("div", {
                className: "flex flex-row flex-wrap gap-4",
                children: children.map((c, i)=>/*#__PURE__*/ _jsx("div", {
                        className: "min-w-[200px] flex-1",
                        children: renderChild(c, pathPrefix, parentPerms)
                    }, c.name ?? `_${c.type}_${i}`))
            }, `row:${pathPrefix}:${children.map((c)=>c.name ?? c.type).join('|')}`);
        }
        if (child.type === 'collapsible') {
            const children = (child.fields ?? []).filter((c)=>isRenderableHere(c) && isFieldVisible(c, parentPerms));
            if (children.length === 0) return null;
            return /*#__PURE__*/ _jsx("div", {
                className: "flex flex-col gap-4 rounded-md border p-3",
                children: children.map((c)=>renderChild(c, pathPrefix, parentPerms))
            }, `collapsible:${pathPrefix}`);
        }
        if (child.type === 'group') {
            if (!child.name) return null;
            return /*#__PURE__*/ _jsx(GroupSection, {
                field: child,
                pathPrefix: `${pathPrefix}${child.name}.`,
                parentPerms: parentPerms,
                renderChild: renderChild
            }, `group-${pathPrefix}${child.name}`);
        }
        if (child.type === 'tabs') {
            return /*#__PURE__*/ _jsx(TabsSection, {
                field: child,
                pathPrefix: pathPrefix,
                parentPerms: parentPerms,
                renderChild: renderChild
            }, `tabs-${pathPrefix}${child.name ?? 't'}`);
        }
        return renderField(child, pathPrefix, parentPerms);
    };
    const visibleTopLevel = fields.filter(isRenderableHere);
    return /*#__PURE__*/ _jsx("div", {
        className: "flex flex-col gap-4",
        children: visibleTopLevel.map((f)=>renderChild(f, '', docPermissions))
    });
}

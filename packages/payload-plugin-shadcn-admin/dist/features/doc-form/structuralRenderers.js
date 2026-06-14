'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Structural renderers for group + tabs. Mirrors the row/collapsible pattern
   that lives inline in AutoDocFormBridge's renderStructure. The bridge passes
   a renderChild callback so these helpers don't need to know about field
   values, errors, or dirty state — they only handle layout + nested-path
   bookkeeping.

   v3.7 access-control: renderChild's third arg carries the sanitized
   FieldPermissions of the parent container, so children can be gated on
   `canRead` / `canUpdate`. Containers also use `isFieldVisible` to hide
   themselves when every child is read-denied. */ import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'payload-plugin-shadcn-ui';
import { canRead, isFieldVisible, subPerms } from './access-control/fieldPermissions.js';
const labelOf = (field)=>field.label && field.label.length > 0 ? field.label : field.name ?? '';
const tabLabelOf = (tab, idx)=>{
    if (tab.label && tab.label.length > 0) return tab.label;
    if (tab.name && tab.name.length > 0) return tab.name;
    return `Tab ${idx + 1}`;
};
const tabValueOf = (tab, idx)=>tab.name && tab.name.length > 0 ? tab.name : `__unnamed_${idx}`;
export function GroupSection({ field, pathPrefix, parentPerms, renderChild }) {
    const children = field.fields ?? [];
    if (children.length === 0) return null;
    // The group's own perms object (with .fields for its children). When the
    // group field has no perms entry, undefined → all children allowed by
    // default (Payload convention).
    const groupPerms = field.name ? subPerms(parentPerms, field.name) : parentPerms;
    // Hide whole group when every child is read-denied.
    if (!children.some((c)=>isFieldVisible(c, groupPerms))) return null;
    const label = labelOf(field);
    return /*#__PURE__*/ _jsxs("section", {
        className: "flex flex-col gap-3 rounded-md border p-3",
        children: [
            label ? /*#__PURE__*/ _jsx("header", {
                className: "text-sm font-medium text-foreground",
                children: label
            }) : null,
            /*#__PURE__*/ _jsx("div", {
                className: "flex flex-col gap-4",
                children: children.map((child)=>renderChild(child, pathPrefix, groupPerms))
            })
        ]
    });
}
export function TabsSection({ field, pathPrefix, parentPerms, renderChild }) {
    const tabs = field.tabs ?? [];
    if (tabs.length === 0) return null;
    // Filter to tabs the user can see anything in. A named tab is gated by
    // its own `canRead` first (it's a perms node); then either named or
    // unnamed tabs need at least one visible child.
    const visibleTabs = tabs.filter((tab)=>{
        if (tab.name && !canRead(parentPerms, tab.name)) return false;
        const tabPerms = tab.name ? subPerms(parentPerms, tab.name) : parentPerms;
        return tab.fields.some((c)=>isFieldVisible(c, tabPerms));
    });
    if (visibleTabs.length === 0) return null;
    const first = visibleTabs[0];
    if (!first) return null;
    const firstIdx = tabs.indexOf(first);
    return /*#__PURE__*/ _jsxs(Tabs, {
        defaultValue: tabValueOf(first, firstIdx),
        className: "w-full",
        children: [
            /*#__PURE__*/ _jsx(TabsList, {
                children: visibleTabs.map((tab)=>{
                    const idx = tabs.indexOf(tab);
                    return /*#__PURE__*/ _jsx(TabsTrigger, {
                        value: tabValueOf(tab, idx),
                        children: tabLabelOf(tab, idx)
                    }, tabValueOf(tab, idx));
                })
            }),
            visibleTabs.map((tab)=>{
                const idx = tabs.indexOf(tab);
                const tabPrefix = tab.name && tab.name.length > 0 ? `${pathPrefix}${tab.name}.` : pathPrefix;
                const tabPerms = tab.name ? subPerms(parentPerms, tab.name) : parentPerms;
                return /*#__PURE__*/ _jsx(TabsContent, {
                    value: tabValueOf(tab, idx),
                    className: "flex flex-col gap-4 pt-2",
                    children: tab.fields.map((child)=>renderChild(child, tabPrefix, tabPerms))
                }, tabValueOf(tab, idx));
            })
        ]
    });
}

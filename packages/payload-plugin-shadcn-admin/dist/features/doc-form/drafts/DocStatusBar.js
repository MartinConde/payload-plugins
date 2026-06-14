'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* Top-of-form status surface for the auto doc form. v3.6: status pill
   (Draft / Published / Modified / Saving… / Saved 12:43 / Error) + autosave-
   paused hint.
   v3.8.1: per-locale state when `versions.drafts.localizeStatus: true` AND
   multiple locales are configured. The active locale carries the lifecycle
   (Modified / Saving… / Saved / Autosaving…); others show persisted state.
   v3.25: when `onLocaleChange` is provided and the doc is multi-locale, the bar
   renders a single segmented control (globe + one clickable segment per locale,
   each showing that locale's status) — combining the locale switcher and the
   status pills into one h-8 control. Otherwise it falls back to the single pill.
   Pure presentation — all derived state comes in via props. */ import * as React from 'react';
import { GlobeIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Badge } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
import { toneClassName, persistedStatusPill } from './statusPill.js';
/* Tone → foreground-only colour, for the compact segmented control where a full
   badge background would be too heavy inside a button. */ const toneTextClassName = (tone)=>tone === 'success' ? 'text-emerald-700 dark:text-emerald-300' : tone === 'warn' ? 'text-amber-700 dark:text-amber-300' : tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground';
const formatTime = (ts)=>{
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
};
/* Lifecycle-aware pill content for the ACTIVE locale (or the only pill when
   single-locale). Cascade order matters: `saving`/`autosaving`/`error` win
   over dirty; `dirty` MUST be checked before `saved` so the "Saved · 12:43"
   pill doesn't linger after the user types again. */ const activePillContent = (status, dirty, lastSavedAt, docStatus, t)=>status === 'saving' || status === 'autosaving' ? {
        label: status === 'autosaving' ? t ? `${t('shadcnAdmin:autosaving')}…` : 'Autosaving…' : t ? t('general:saving') : 'Saving…',
        tone: 'muted'
    } : status === 'error' ? {
        label: t ? t('shadcnAdmin:saveFailed') : 'Save failed',
        tone: 'destructive'
    } : dirty ? {
        label: t ? t('shadcnAdmin:modified') : 'Modified',
        tone: 'warn'
    } : status === 'saved' && lastSavedAt !== null ? {
        label: t ? t('shadcnAdmin:savedAt', {
            time: formatTime(lastSavedAt)
        }) : `Saved · ${formatTime(lastSavedAt)}`,
        tone: 'success'
    } : docStatus === 'published' ? {
        label: t ? t('version:published') : 'Published',
        tone: 'success'
    } : {
        label: t ? t('version:draft') : 'Draft',
        tone: 'muted'
    };
export function DocStatusBar({ draftsEnabled, docStatus, dirty, status, lastSavedAt, autosavePaused, locales, activeLocale, perLocaleStatus, bare = false, onLocaleChange, switchDisabled = false }) {
    const { t } = useTranslation();
    // v3.25 — segmented mode combines the locale switcher and the status pills.
    // Needs a change handler and more than one locale; works with drafts on or off
    // (off → segments show locale codes only, for switching).
    const segmentedMode = Boolean(onLocaleChange && locales && locales.length > 1 && activeLocale);
    // Nothing to show when drafts are off and there's no locale switching to offer.
    if (!draftsEnabled && !segmentedMode) return null;
    const autosaveHint = autosavePaused ? /*#__PURE__*/ _jsx("span", {
        className: "text-xs text-muted-foreground",
        children: t('shadcnAdmin:autosavePaused')
    }) : null;
    if (segmentedMode && locales) {
        return /*#__PURE__*/ _jsxs("div", {
            className: "flex flex-wrap items-center gap-2",
            children: [
                /*#__PURE__*/ _jsxs("div", {
                    className: "inline-flex h-8 items-center gap-0.5 rounded-md p-0.5",
                    children: [
                        /*#__PURE__*/ _jsx(GlobeIcon, {
                            className: "mx-1 size-3.5 shrink-0 text-muted-foreground"
                        }),
                        locales.map((loc)=>{
                            const isActive = loc.code === activeLocale;
                            // Per-segment status: active locale uses the live lifecycle; others
                            // use their persisted state (only when localizeStatus exposes it).
                            const pc = !draftsEnabled ? null : isActive ? activePillContent(status, dirty, lastSavedAt, docStatus, t) : perLocaleStatus ? persistedStatusPill(perLocaleStatus[loc.code], t) : null;
                            return /*#__PURE__*/ _jsxs("button", {
                                type: "button",
                                title: loc.label,
                                "aria-pressed": isActive,
                                disabled: switchDisabled,
                                onClick: ()=>{
                                    if (!isActive) onLocaleChange?.(loc.code);
                                },
                                className: cn('inline-flex h-7 items-center rounded-md px-2.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-60', isActive ? 'bg-primary font-semibold text-primary-foreground shadow-sm' : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'),
                                children: [
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "uppercase tracking-wider",
                                        children: loc.code
                                    }),
                                    pc ? /*#__PURE__*/ _jsxs(_Fragment, {
                                        children: [
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "mx-1.5 opacity-40",
                                                children: "·"
                                            }),
                                            /*#__PURE__*/ _jsx("span", {
                                                className: isActive ? 'text-primary-foreground/90' : toneTextClassName(pc.tone),
                                                children: pc.label
                                            })
                                        ]
                                    }) : null
                                ]
                            }, loc.code);
                        })
                    ]
                }),
                autosaveHint
            ]
        });
    }
    // Fallback: single status pill (single-locale or non-localized docs).
    const pc = activePillContent(status, dirty, lastSavedAt, docStatus, t);
    return /*#__PURE__*/ _jsx("section", {
        className: cn('flex flex-wrap items-center justify-between gap-2', !bare && 'rounded-md border bg-card px-3 py-2'),
        children: /*#__PURE__*/ _jsxs("div", {
            className: "flex flex-wrap items-center gap-2",
            children: [
                /*#__PURE__*/ _jsx(Badge, {
                    variant: "outline",
                    className: cn('font-medium', toneClassName(pc.tone)),
                    children: pc.label
                }),
                autosaveHint
            ]
        })
    });
}

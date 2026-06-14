import * as React from 'react';
import type { ExtractedLocale } from '../localization/LocaleSwitcher.js';
export type DocStatusBarStatus = 'idle' | 'saving' | 'autosaving' | 'saved' | 'error';
export type DocStatusBarProps = {
    /** Drafts mode flag — when false this bar collapses to nothing (no UI). */
    draftsEnabled: boolean;
    /** `_status` value from the server doc, if drafts are on. */
    docStatus?: 'draft' | 'published' | null;
    /** True when the form is dirty relative to its last persisted state. */
    dirty: boolean;
    /** Overall lifecycle status of the most recent save attempt. */
    status: DocStatusBarStatus;
    /** Epoch ms of the most recent successful save (manual or autosave). */
    lastSavedAt: number | null;
    /** True when autosave is hard-skipped (e.g. a file is staged for multipart). */
    autosavePaused: boolean;
    /** v3.8.1 — locales available; required (along with `perLocaleStatus`) for
     *  per-locale pill mode. */
    locales?: ExtractedLocale[];
    /** v3.8.1 — active locale code. */
    activeLocale?: string | null;
    /** v3.8.1 — per-locale persisted status from `_status` when it's a
     *  locale-keyed object (requires `versions.drafts.localizeStatus: true`).
     *  When provided AND `locales.length > 1`, the bar renders one pill per
     *  locale instead of the single pill. */
    perLocaleStatus?: Record<string, 'draft' | 'published'>;
    /** When true, drop the outer card chrome (border/background/padding) so the
     *  pills sit inline inside the sticky toolbar instead of as a standalone card. */
    bare?: boolean;
    /** v3.25 — when provided AND multi-locale, the bar becomes a segmented locale
     *  switcher: clicking a locale segment calls this. Combines the old
     *  LocaleSwitcher dropdown and the status pills into one control. */
    onLocaleChange?: (code: string) => void;
    /** Disable segment clicks (e.g. while a save is in flight). */
    switchDisabled?: boolean;
};
export declare function DocStatusBar({ draftsEnabled, docStatus, dirty, status, lastSavedAt, autosavePaused, locales, activeLocale, perLocaleStatus, bare, onLocaleChange, switchDisabled, }: DocStatusBarProps): React.ReactElement | null;

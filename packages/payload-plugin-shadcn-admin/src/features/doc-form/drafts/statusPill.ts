/* Shared status-pill tone vocabulary for the drafts/versions UI. Extracted from
   DocStatusBar so the status bar, the versions list, and the version diff view
   render draft/published state with one consistent set of tones. v3.9. */

export type PillTone = 'muted' | 'success' | 'warn' | 'destructive'

/** Loosely-typed translate fn (accepts both default- and custom-keyed
 *  TFunctions). Optional everywhere — absent → English literals. */
export type PillT = (key: any, options?: any) => string

export const toneClassName = (tone: PillTone): string =>
  tone === 'success'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : tone === 'warn'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : tone === 'destructive'
        ? 'border-destructive/40 bg-destructive/10 text-destructive'
        : 'border-border bg-muted/40 text-muted-foreground'

/** Persisted draft/published pill content — no lifecycle state. Shared by the
 *  versions list, the version diff header, and DocStatusBar's non-active
 *  locale pills. */
export const persistedStatusPill = (
  status: 'draft' | 'published' | null | undefined,
  t?: PillT,
): { label: string; tone: PillTone } =>
  status === 'published'
    ? { label: t ? t('version:published') : 'Published', tone: 'success' }
    : { label: t ? t('version:draft') : 'Draft', tone: 'muted' }

'use client'

/* Client stepper for the SEO setup wizard. Reached only via importMap (string
   path registration in plugin.ts), never imported at config-load, so it may
   freely use the shadcn-admin `/client` UI primitives — unlike the Node-safe
   `SeoGroupInput` `.input` override.

   Edits a curated subset of the `seo-settings` global and upserts it via
   `POST /api/globals/{slug}` (the verb Payload uses for globals — singletons
   have no id). The site-wide checklist is recomputed live from local state;
   per-collection completeness comes from the server and refreshes on save. */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@payloadcms/ui'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  type ExtractedCollection,
} from 'payload-plugin-shadcn-ui'
// SearchableSelect + UploadFieldInput stay in the admin plugin: both depend on
// bridge-internal hooks (relationship picker, multipart upload handler).
import {
  SearchableSelect,
  UploadFieldInput,
} from 'payload-plugin-shadcn-admin/client'

import { OG_LOCALE_OPTIONS } from '../fields/seoSettingsGlobal.js'
import type { SeoTranslationsKeys } from '../translations.js'
import {
  computeSettingsChecklist,
  completionPercent,
  type CheckStatus,
  type CollectionHealth,
  type SeoSettingsData,
} from './audit.js'

const CHANGEFREQS: { value: string; key: SeoTranslationsKeys }[] = [
  { value: 'always', key: 'pluginSeo:cfAlways' },
  { value: 'hourly', key: 'pluginSeo:cfHourly' },
  { value: 'daily', key: 'pluginSeo:cfDaily' },
  { value: 'weekly', key: 'pluginSeo:cfWeekly' },
  { value: 'monthly', key: 'pluginSeo:cfMonthly' },
  { value: 'yearly', key: 'pluginSeo:cfYearly' },
  { value: 'never', key: 'pluginSeo:cfNever' },
]

type SameAs = { url?: string | null }
type CollectionTemplate = {
  collection?: string
  titleTemplate?: string
  descriptionTemplate?: string
}

type WizardData = SeoSettingsData & {
  defaultTwitterCard?: string | null
  defaultLocale?: string | null
  defaultNoindex?: boolean | null
  defaultNofollow?: boolean | null
  collectionTemplates?: CollectionTemplate[] | null
  organization?: SeoSettingsData['organization'] & {
    logo?: number | string | { id?: number | string } | null
  }
}

type Props = {
  settingsSlug: string
  mediaSlug: string
  initialData: Record<string, unknown>
  collections: CollectionHealth[]
  collectionSlugs: string[]
  /** Default locale the wizard reads/writes/audits against (null = no
   *  localization). Pinning all three to one locale keeps the health panel in
   *  sync with the values being edited. */
  defaultLocale: string | null
  /** `useAsTitle` per collection slug — lets the reused `UploadFieldInput`'s
   *  picker do a title search. */
  useAsTitleBySlug: Record<string, string | undefined>
  /** Serialized upload-collection metadata for the reused `UploadFieldInput`'s
   *  "Upload new" dialog. */
  uploadCollectionsBySlug: Record<string, ExtractedCollection>
}

const idOf = (
  v: number | string | { id?: number | string } | null | undefined,
): number | string | null => {
  if (v == null) return null
  if (typeof v === 'object') return v.id ?? null
  return v
}

export function SeoWizardClient({
  settingsSlug,
  mediaSlug,
  initialData,
  collections,
  collectionSlugs,
  defaultLocale,
  useAsTitleBySlug,
  uploadCollectionsBySlug,
}: Props): React.ReactElement {
  const { t } = useTranslation()
  const router = useRouter()
  const tr = React.useCallback(
    (k: SeoTranslationsKeys): string => (t as (key: string) => string)(k),
    [t],
  )

  const [data, setData] = React.useState<WizardData>(() => ({
    ...(initialData as WizardData),
    defaultOgImage: idOf(initialData.defaultOgImage as never),
    organization: {
      ...((initialData.organization as WizardData['organization']) ?? {}),
      logo: idOf((initialData.organization as { logo?: never })?.logo),
    },
  }))
  const [step, setStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const set = <K extends keyof WizardData>(key: K, value: WizardData[K]): void => {
    setData((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }
  const setOrg = (patch: Partial<NonNullable<WizardData['organization']>>): void => {
    setData((d) => ({ ...d, organization: { ...(d.organization ?? {}), ...patch } }))
    setSaved(false)
  }
  const setSitemap = (patch: Partial<NonNullable<WizardData['sitemap']>>): void => {
    setData((d) => ({ ...d, sitemap: { ...(d.sitemap ?? {}), ...patch } }))
    setSaved(false)
  }

  const checklist = computeSettingsChecklist(data)
  const percent = completionPercent(checklist)

  const steps: { key: SeoTranslationsKeys; render: () => React.ReactNode }[] = [
    { key: 'pluginSeo:tabDefaults', render: renderDefaults },
    { key: 'pluginSeo:tabTemplates', render: renderPatterns },
    { key: 'pluginSeo:tabOrganization', render: renderOrganization },
    { key: 'pluginSeo:tabSitemap', render: renderSitemap },
    { key: 'pluginSeo:wizardStepReview', render: renderReview },
  ]
  const isLast = step === steps.length - 1

  async function save(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      const url = defaultLocale
        ? `/api/globals/${settingsSlug}?locale=${defaultLocale}`
        : `/api/globals/${settingsSlug}`
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        let msg = tr('pluginSeo:wizardSaveError')
        try {
          const body = (await res.json()) as { errors?: { message?: string }[] }
          if (body.errors?.[0]?.message) msg = body.errors[0].message
        } catch {
          /* keep generic message */
        }
        setError(msg)
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError(tr('pluginSeo:wizardSaveError'))
    } finally {
      setSaving(false)
    }
  }

  // ---- step renderers ----

  function renderDefaults(): React.ReactNode {
    return (
      <div className="space-y-4">
        <Field
          label={tr('pluginSeo:titleTemplateLabel')}
          description={tr('pluginSeo:titleTemplateDesc')}
        >
          <Input
            value={data.titleTemplate ?? ''}
            placeholder="%s — Acme"
            onChange={(e) => set('titleTemplate', e.target.value)}
          />
        </Field>
        <Field
          label={tr('pluginSeo:defaultDescriptionLabel')}
          description={tr('pluginSeo:defaultDescriptionDesc')}
        >
          <Textarea
            value={data.defaultDescription ?? ''}
            onChange={(e) => set('defaultDescription', e.target.value)}
          />
        </Field>
        <Field
          label={tr('pluginSeo:defaultOgImageLabel')}
          description={tr('pluginSeo:defaultOgImageDesc')}
        >
          <UploadFieldInput
            fieldName="defaultOgImage"
            relationTo={mediaSlug}
            hasMany={false}
            useAsTitleBySlug={useAsTitleBySlug}
            uploadCollectionsBySlug={uploadCollectionsBySlug}
            value={idOf(data.defaultOgImage)}
            onChange={(v) => set('defaultOgImage', (v as number | string | null) ?? null)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={tr('pluginSeo:defaultTwitterCardLabel')}>
            <Select
              value={data.defaultTwitterCard ?? 'summary_large_image'}
              onValueChange={(v) => set('defaultTwitterCard', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">
                  {tr('pluginSeo:twitterCardSummary')}
                </SelectItem>
                <SelectItem value="summary_large_image">
                  {tr('pluginSeo:twitterCardSummaryLarge')}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={tr('pluginSeo:defaultLocaleLabel')}>
            <SearchableSelect
              id="seo-default-locale"
              options={OG_LOCALE_OPTIONS}
              value={data.defaultLocale ?? ''}
              onChange={(v) => set('defaultLocale', v || null)}
            />
          </Field>
        </div>
        <div className="flex gap-6">
          <Checkbox
            label={tr('pluginSeo:noindex')}
            checked={!!data.defaultNoindex}
            onChange={(v) => set('defaultNoindex', v)}
          />
          <Checkbox
            label={tr('pluginSeo:nofollow')}
            checked={!!data.defaultNofollow}
            onChange={(v) => set('defaultNofollow', v)}
          />
        </div>
      </div>
    )
  }

  function renderPatterns(): React.ReactNode {
    const rows = data.collectionTemplates ?? []
    const update = (i: number, patch: Partial<CollectionTemplate>): void => {
      const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
      set('collectionTemplates', next)
    }
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {tr('pluginSeo:templateTokensDesc')}
        </p>
        {rows.map((row, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between gap-2">
                {collectionSlugs.length > 0 ? (
                  <Select
                    value={row.collection ?? undefined}
                    onValueChange={(v) => update(i, { collection: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={tr('pluginSeo:templateCollectionLabel')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {collectionSlugs.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={row.collection ?? ''}
                    placeholder={tr('pluginSeo:templateCollectionLabel')}
                    onChange={(e) => update(i, { collection: e.target.value })}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    set(
                      'collectionTemplates',
                      rows.filter((_, idx) => idx !== i),
                    )
                  }
                  aria-label={tr('pluginSeo:wizardRemove')}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <Input
                value={row.titleTemplate ?? ''}
                placeholder={tr('pluginSeo:patternTitleLabel')}
                onChange={(e) => update(i, { titleTemplate: e.target.value })}
              />
              <Textarea
                value={row.descriptionTemplate ?? ''}
                placeholder={tr('pluginSeo:patternDescriptionLabel')}
                onChange={(e) =>
                  update(i, { descriptionTemplate: e.target.value })
                }
              />
            </CardContent>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => set('collectionTemplates', [...rows, {}])}
        >
          <Plus className="size-4" /> {tr('pluginSeo:patternsAdd')}
        </Button>
      </div>
    )
  }

  function renderOrganization(): React.ReactNode {
    const social = data.organization?.sameAs ?? []
    const updateSocial = (i: number, url: string): void =>
      setOrg({ sameAs: social.map((s, idx) => (idx === i ? { url } : s)) })
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={tr('pluginSeo:orgNameLabel')}>
            <Input
              value={data.organization?.name ?? ''}
              onChange={(e) => setOrg({ name: e.target.value })}
            />
          </Field>
          <Field label={tr('pluginSeo:labelUrl')}>
            <Input
              value={data.organization?.url ?? ''}
              placeholder="https://example.com"
              onChange={(e) => setOrg({ url: e.target.value })}
            />
          </Field>
        </div>
        <Field label={tr('pluginSeo:orgLogoLabel')}>
          <UploadFieldInput
            fieldName="organizationLogo"
            relationTo={mediaSlug}
            hasMany={false}
            useAsTitleBySlug={useAsTitleBySlug}
            uploadCollectionsBySlug={uploadCollectionsBySlug}
            value={idOf(data.organization?.logo)}
            onChange={(v) => setOrg({ logo: (v as number | string | null) ?? null })}
          />
        </Field>
        <Field label={tr('pluginSeo:sameAsLabel')}>
          <div className="space-y-2">
            {social.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={s?.url ?? ''}
                  placeholder="https://…"
                  onChange={(e) => updateSocial(i, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setOrg({ sameAs: social.filter((_, idx) => idx !== i) })
                  }
                  aria-label={tr('pluginSeo:wizardRemove')}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOrg({ sameAs: [...social, { url: '' }] })}
            >
              <Plus className="size-4" /> {tr('pluginSeo:sameAsAdd')}
            </Button>
          </div>
        </Field>
      </div>
    )
  }

  function renderSitemap(): React.ReactNode {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={tr('pluginSeo:changefreqLabel')}>
          <Select
            value={data.sitemap?.changefreq ?? undefined}
            onValueChange={(v) => setSitemap({ changefreq: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {CHANGEFREQS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {tr(c.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={tr('pluginSeo:priorityLabel')}
          description={tr('pluginSeo:priorityDesc')}
        >
          <Input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={data.sitemap?.priority ?? ''}
            onChange={(e) =>
              setSitemap({
                priority: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </Field>
      </div>
    )
  }

  function renderReview(): React.ReactNode {
    return (
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {tr('pluginSeo:healthSettingsTitle')}
            </h3>
            <span className="text-sm text-muted-foreground">
              {percent}% {tr('pluginSeo:healthCompleteSuffix')}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <StatusIcon status={item.status} />
                <span>{tr(item.labelKey)}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-medium">
            {tr('pluginSeo:healthCollectionsTitle')}
          </h3>
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tr('pluginSeo:healthNoCollections')}
            </p>
          ) : (
            <ul className="space-y-2">
              {collections.map((c) => (
                <li
                  key={c.slug}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <StatusIcon status={c.missing === 0 ? 'ok' : 'warn'} />
                    {c.label}
                    {c.missing === 0 ? (
                      <Badge variant="secondary">
                        {tr('pluginSeo:healthAllGood')}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {c.missing} {tr('pluginSeo:healthOf')} {c.total}{' '}
                        {tr('pluginSeo:healthMissingSuffix')}
                      </Badge>
                    )}
                  </span>
                  <a
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    href={`/admin/collections/${c.slug}`}
                  >
                    {tr('pluginSeo:wizardReview')}
                    <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <a
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          href={`/admin/globals/${settingsSlug}`}
        >
          {tr('pluginSeo:wizardOpenSettings')}
          <ExternalLink className="size-3" />
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
          {tr('pluginSeo:wizardIntro')}
        </p>
        {defaultLocale ? (
          <Badge variant="outline" className="mt-1 shrink-0">
            {defaultLocale}
          </Badge>
        ) : null}
      </div>

      {/* step indicator */}
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              i === step
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {i + 1}. {tr(s.key)}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tr(steps[step].key)}</CardTitle>
          {step === steps.length - 1 ? (
            <CardDescription>{tr('pluginSeo:healthTitle')}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>{steps[step].render()}</CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft className="size-4" /> {tr('pluginSeo:wizardBack')}
        </Button>
        <div className="flex items-center gap-2">
          {saved ? (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Check className="size-4" /> {tr('pluginSeo:wizardSaved')}
            </span>
          ) : null}
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? tr('pluginSeo:wizardSaving') : tr('pluginSeo:wizardSave')}
          </Button>
          {!isLast ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            >
              {tr('pluginSeo:wizardNext')} <ArrowRight className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ---- small presentational helpers ----

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}): React.ReactElement {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 rounded border-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

function StatusIcon({ status }: { status: CheckStatus }): React.ReactElement {
  if (status === 'ok')
    return <Check className="size-4 shrink-0 text-green-600" />
  if (status === 'warn')
    return <TriangleAlert className="size-4 shrink-0 text-amber-500" />
  return <X className="size-4 shrink-0 text-muted-foreground" />
}

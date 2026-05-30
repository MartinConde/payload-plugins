'use client'

/* SEO group renderer, mounted by shadcn-admin's group-level `.input` override
   (v3.19). Receives the whole `meta` group object as `value` (live — the bridge
   re-renders on every keystroke) plus `renderChild`, which it uses to render the
   real subfield inputs back through the host form. `value` drives the read-only
   SERP / social previews and the character counters; it is never written here
   (the delegated inputs own writes via the bridge's setValueAtPath).

   IMPORTANT: this module is pulled into the Payload server config graph (it is
   referenced as a direct component reference in `field.custom`, the verified
   `.cell`/`.input` pattern). The Payload CLI loads that graph in plain Node, so
   this file must stay Node-safe: NO value imports from
   `payload-plugin-shadcn-admin/client` (its barrel pulls @payloadcms/ui → CSS
   imports that crash Node). Types are `import type` (erased); visuals are plain
   token-classed divs; the active locale arrives as a prop. */

import * as React from 'react'
import { ChevronDown, Globe, ImageIcon, Search } from 'lucide-react'

import type { TFunction } from '@payloadcms/translations'
import type { ExtractedField, FieldInputProps } from './adminTypes.js'
import type { SeoTranslationsKeys } from '../translations.js'

/* Translate a `pluginSeo:` key via the threaded `t` prop, falling back to the
   English literal when `t` is absent (e.g. the component rendered outside the
   host form). `t` arrives typed as the default-key TFunction, so we widen it to
   our key union — purely a type cast, erased at runtime. */
type Tr = (key: SeoTranslationsKeys, fallback: string) => string
const makeTr = (t: FieldInputProps['t']): Tr => {
  const tt = t as TFunction<SeoTranslationsKeys> | undefined
  return (key, fallback) => (tt ? tt(key) : fallback)
}

const TITLE_IDEAL = 60
const DESC_IDEAL = 160

/** Reads a leaf that may be a localized `{ [locale]: value }` object. */
function readLeaf(raw: unknown, locale: string | null | undefined): string {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw
  if (
    locale &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    locale in (raw as Record<string, unknown>)
  ) {
    const v = (raw as Record<string, unknown>)[locale]
    return typeof v === 'string' ? v : ''
  }
  return ''
}

/** Length-vs-ideal meter with semantic color states + over-limit overflow. */
function CharCount({
  label,
  count,
  ideal,
}: {
  label: string
  count: number
  ideal: number
}): React.ReactElement {
  const over = count - ideal
  const tone =
    count === 0
      ? 'bg-muted text-muted-foreground'
      : over > 0
        ? 'bg-destructive/15 text-destructive'
        : count > ideal * 0.9
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${tone}`}
      >
        {count}/{ideal}
        {over > 0 ? <span className="ml-1 font-semibold">+{over}</span> : null}
      </span>
    </span>
  )
}

/** Resolves an upload field value (id or populated doc) to an image URL. */
function useImageUrl(
  value: unknown,
  collectionSlug: string,
): string | null {
  const [url, setUrl] = React.useState<string | null>(null)

  // Populated object → read url synchronously.
  const inlineUrl =
    value && typeof value === 'object' && 'url' in (value as object)
      ? ((value as { url?: unknown }).url as string | undefined) ?? null
      : null

  const id =
    value == null
      ? null
      : typeof value === 'object'
        ? ((value as { id?: unknown }).id ?? null)
        : value

  React.useEffect(() => {
    if (inlineUrl || id == null) {
      setUrl(null)
      return
    }
    let active = true
    fetch(`/api/${collectionSlug}/${id}?depth=0`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!active || !doc) return
        setUrl(doc.thumbnailURL || doc.url || null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [id, inlineUrl, collectionSlug])

  return inlineUrl ?? url
}

function PreviewCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="flex h-full flex-col rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

/** Always-open styled section, matching the preview cards' surface language. */
function Section({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      {title ? (
        <div className="text-sm font-medium">{title}</div>
      ) : null}
      {children}
    </section>
  )
}

/** Hand-rolled collapsible (Node-safe: useState + div + button + lucide icon).
   Replaces Payload's native collapsible chrome so the sections read as cards
   that match the previews instead of a bare "Toggle" row. */
function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}): React.ReactElement {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        {title}
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open ? (
        <div className="flex flex-col gap-4 border-t px-4 py-4">{children}</div>
      ) : null}
    </div>
  )
}

export function SeoGroupInput(props: FieldInputProps): React.ReactElement {
  const { field, value, nestedPath, renderChild, fieldPerms, activeLocale, t } =
    props
  const tr = makeTr(t)

  const meta = (value && typeof value === 'object' ? value : {}) as Record<
    string,
    unknown
  >
  const og = (meta.og && typeof meta.og === 'object' ? meta.og : {}) as Record<
    string,
    unknown
  >

  const subfields = (field.fields ?? []) as ExtractedField[]
  const childPrefix = nestedPath ? `${nestedPath}.` : ''

  // Name → field map so the styled sections can compose subfields by name.
  const byName: Record<string, ExtractedField> = {}
  for (const f of subfields) if (f.name) byName[f.name] = f

  // Upload collection slug, read off the image field's relationTo.
  const imageField = subfields.find((f) => f.name === 'image')
  const imageSlug =
    (typeof imageField?.relationTo === 'string' && imageField.relationTo) ||
    'media'
  const imageUrl = useImageUrl(meta.image, imageSlug)

  const title = readLeaf(meta.title, activeLocale)
  const description = readLeaf(meta.description, activeLocale)
  const ogTitle = readLeaf(og.title, activeLocale) || title
  const ogDescription = readLeaf(og.description, activeLocale) || description

  const canonical =
    typeof meta.canonicalUrl === 'string' && meta.canonicalUrl
      ? meta.canonicalUrl
      : ''

  const { host, crumb } = (() => {
    try {
      const u = new URL(canonical || 'https://example.com')
      const segs = u.pathname.split('/').filter(Boolean)
      return {
        host: u.host,
        crumb: segs.length ? `${u.host} › ${segs.join(' › ')}` : u.host,
      }
    } catch {
      return { host: 'example.com', crumb: 'example.com' }
    }
  })()

  return (
    <div className="flex flex-col gap-5">
      {/* Live previews — side by side on wider screens (also keeps the OG
          image from dominating), stacked when narrow. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PreviewCard
          icon={<Search className="size-3.5" />}
          title={tr('pluginSeo:searchPreview', 'Search result preview')}
        >
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted">
                <Globe className="size-3 text-muted-foreground" />
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {crumb}
              </span>
              {activeLocale ? (
                <span className="rounded bg-muted px-1 text-[10px] font-medium uppercase text-muted-foreground">
                  {activeLocale}
                </span>
              ) : null}
            </div>
            <div className="text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">
              {title ||
                tr('pluginSeo:metaTitlePlaceholder', 'Your meta title appears here')}
            </div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {description ||
                tr(
                  'pluginSeo:metaDescPlaceholder',
                  'Your meta description appears here. Add one to control the snippet shown in search results.',
                )}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3">
              <CharCount
                label={tr('pluginSeo:charCountTitle', 'Title')}
                count={title.length}
                ideal={TITLE_IDEAL}
              />
              <CharCount
                label={tr('pluginSeo:charCountDescription', 'Description')}
                count={description.length}
                ideal={DESC_IDEAL}
              />
            </div>
          </div>
        </PreviewCard>

        <PreviewCard
          icon={<Globe className="size-3.5" />}
          title={tr('pluginSeo:socialPreview', 'Social share preview')}
        >
          <div className="overflow-hidden rounded-lg border">
            <div className="flex h-44 w-full items-center justify-center bg-muted">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="size-6" />
                  <span className="text-xs">
                    {tr('pluginSeo:noOgImage', 'No OG image')}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 border-t bg-muted/30 px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {host}
              </div>
              <div className="truncate text-sm font-semibold">
                {ogTitle || tr('pluginSeo:ogTitlePlaceholder', 'Open Graph title')}
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {ogDescription ||
                  tr('pluginSeo:ogDescPlaceholder', 'Open Graph description')}
              </p>
            </div>
          </div>
        </PreviewCard>
      </div>

      {/* The real inputs, delegated back to the host form's renderer but
          composed by name into styled sections (the field tree is now flat —
          metaField.ts no longer carries collapsibles). */}
      {renderChild ? (
        <SeoSections
          byName={byName}
          childPrefix={childPrefix}
          fieldPerms={fieldPerms}
          renderChild={renderChild}
          tr={tr}
        />
      ) : null}
    </div>
  )
}

/** Composes the delegated subfield inputs into the styled section layout. */
function SeoSections({
  byName,
  childPrefix,
  fieldPerms,
  renderChild,
  tr,
}: {
  byName: Record<string, ExtractedField>
  childPrefix: string
  fieldPerms: FieldInputProps['fieldPerms']
  renderChild: NonNullable<FieldInputProps['renderChild']>
  tr: Tr
}): React.ReactElement {
  const field = (name: string): React.ReactNode =>
    byName[name] ? renderChild(byName[name], childPrefix, fieldPerms) : null

  // Subfields not wired into a section below — rendered in a trailing block so
  // a future addition to metaField.ts is never silently dropped.
  const known = new Set([
    'title',
    'description',
    'image',
    'noindex',
    'nofollow',
    'canonicalUrl',
    'og',
    'twitter',
    'breadcrumbTitle',
    'schema',
    // Opt-in virtual field — listed so it's never dropped into "Other", but
    // intentionally never rendered (it's a read-only, API-only computed value).
    'jsonLdComputed',
  ])
  const leftover = Object.keys(byName).filter((n) => !known.has(n))

  return (
    <div className="flex flex-col gap-4">
      <Section title={tr('pluginSeo:sectionBasics', 'Basics')}>
        {field('title')}
        {field('description')}
        {field('image')}
      </Section>

      <CollapsibleSection
        title={tr('pluginSeo:sectionRobots', 'Robots & canonical')}
      >
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[180px] flex-1">{field('noindex')}</div>
          <div className="min-w-[180px] flex-1">{field('nofollow')}</div>
        </div>
        {field('canonicalUrl')}
      </CollapsibleSection>

      <CollapsibleSection
        title={tr('pluginSeo:sectionSocial', 'Social (Open Graph & Twitter)')}
      >
        {field('og')}
        {field('twitter')}
      </CollapsibleSection>

      <CollapsibleSection
        title={tr('pluginSeo:sectionStructuredData', 'Structured data')}
      >
        {field('schema')}
      </CollapsibleSection>

      <CollapsibleSection title={tr('pluginSeo:sectionAdvanced', 'Advanced')}>
        {field('breadcrumbTitle')}
      </CollapsibleSection>

      {leftover.length ? (
        <Section title={tr('pluginSeo:sectionOther', 'Other')}>
          {leftover.map((n) => (
            <React.Fragment key={n}>{field(n)}</React.Fragment>
          ))}
        </Section>
      ) : null}
    </div>
  )
}

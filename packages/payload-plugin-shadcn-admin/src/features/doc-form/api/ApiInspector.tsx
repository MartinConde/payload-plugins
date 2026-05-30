'use client'

import * as React from 'react'
import { Check, Copy, Maximize2, Minimize2 } from 'lucide-react'
import {
  toast,
  useConfig,
  useDocumentInfo,
  useLocale,
  useTranslation,
} from '../../../internal/payloadAdapter.js'
import { useSearchParams } from 'next/navigation.js'
import { formatAdminURL, hasDraftsEnabled } from '../../../internal/payloadAdapter.js'

import { Checkbox } from 'payload-plugin-shadcn-ui'
import { Input } from 'payload-plugin-shadcn-ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'
import { RenderJson } from './RenderJson.js'

/* shadcn-styled replacement for Payload's `APIViewClient`
   (node_modules/@payloadcms/next/dist/views/API/index.client.js). Functionally
   1:1 — same fetch URL/params, same `credentials` toggle, same Accept-Language
   header, same defaults — but rendered with the plugin's shadcn primitives and
   layout instead of Payload's `Form`/`Gutter`/`CheckboxField` chrome. Mounted
   by AutoApiView inside the shadcn doc-view shell. */
export function ApiInspector() {
  const { id, collectionSlug, globalSlug, initialData, isTrashed } =
    useDocumentInfo()
  const searchParams = useSearchParams()
  const { i18n, t } = useTranslation()
  const { code } = useLocale()
  const {
    config: {
      defaultDepth,
      localization,
      routes: { api: apiRoute },
      serverURL,
    },
    getEntityConfig,
  } = useConfig()

  const collectionConfig = getEntityConfig({ collectionSlug })
  const globalConfig = getEntityConfig({ globalSlug })

  const localeOptions =
    localization &&
    localization.locales.map((locale) => ({
      label: typeof locale.label === 'string' ? locale.label : locale.code,
      value: locale.code,
    }))

  let draftsEnabled = false
  let docEndpoint: string | undefined = undefined
  if (collectionConfig) {
    draftsEnabled = hasDraftsEnabled(collectionConfig)
    docEndpoint = `/${collectionSlug}/${id}`
  }
  if (globalConfig) {
    draftsEnabled = hasDraftsEnabled(globalConfig)
    docEndpoint = `/globals/${globalSlug}`
  }

  const [data, setData] = React.useState<unknown>(initialData)
  const [draft, setDraft] = React.useState(searchParams.get('draft') === 'true')
  const [locale, setLocale] = React.useState(
    searchParams?.get('locale') || code,
  )
  const [depth, setDepth] = React.useState(
    searchParams.get('depth') || defaultDepth.toString(),
  )
  const [authenticated, setAuthenticated] = React.useState(true)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [origin, setOrigin] = React.useState(serverURL || '')
  const [copied, setCopied] = React.useState(false)

  // Set origin to window.location.origin in an effect to avoid hydration errors.
  React.useEffect(() => {
    if (!serverURL) {
      setOrigin(window.location.origin)
    }
  }, [serverURL])

  const trashParam = typeof (initialData as { deletedAt?: unknown })?.deletedAt === 'string'
  const params = new URLSearchParams({
    depth,
    draft: String(draft),
    locale,
    trash: trashParam ? 'true' : 'false',
  }).toString()

  const fetchURL = formatAdminURL({
    apiRoute,
    path: `${docEndpoint}?${params}` as `/${string}`,
    serverURL: origin,
  })

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(fetchURL, {
          credentials: authenticated ? 'include' : 'omit',
          headers: {
            'Accept-Language': i18n.language,
          },
          method: 'GET',
        })
        try {
          const json = await res.json()
          setData(json)
        } catch (error) {
          toast.error('Error parsing response')
          console.error(error) // eslint-disable-line no-console
        }
      } catch (error) {
        toast.error('Error making request')
        console.error(error) // eslint-disable-line no-console
      }
    }
    void fetchData()
  }, [i18n.language, fetchURL, authenticated])

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fetchURL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }, [fetchURL])

  return (
    <div
      className={cn(
        'flex flex-col gap-6 lg:flex-row lg:items-start',
        fullscreen && 'fixed inset-0 z-50 bg-background p-6',
      )}
    >
      {/* Left column — API URL + query controls */}
      {!fullscreen && (
        <div className="w-full shrink-0 space-y-6 lg:w-72">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              API URL
              <button
                aria-label="Copy API URL"
                type="button"
                onClick={handleCopy}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
            <a
              href={fetchURL}
              rel="noopener noreferrer"
              target="_blank"
              className="block break-all text-sm text-primary underline-offset-2 hover:underline"
            >
              {fetchURL}
            </a>
          </div>

          <div className="space-y-3">
            {draftsEnabled && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft}
                  onCheckedChange={() => setDraft(!draft)}
                />
                {t('version:draft')}
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={authenticated}
                onCheckedChange={() => setAuthenticated(!authenticated)}
              />
              {t('authentication:authenticated')}
            </label>
          </div>

          {localeOptions && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('general:locale')}</label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="api-depth">
              {t('general:depth')}
            </label>
            <Input
              id="api-depth"
              type="number"
              min={0}
              max={10}
              step={1}
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Right column — results */}
      <div className="relative min-w-0 flex-1">
        <button
          aria-label="toggle fullscreen"
          type="button"
          onClick={() => setFullscreen(!fullscreen)}
          className="absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {fullscreen ? (
            <Minimize2 className="size-3.5" />
          ) : (
            <Maximize2 className="size-3.5" />
          )}
        </button>
        <div
          className={cn(
            'overflow-auto rounded-md border border-border bg-muted/40 p-4 font-mono text-sm leading-relaxed',
            fullscreen ? 'h-full' : 'max-h-[calc(100vh-12rem)]',
          )}
        >
          <ul>
            <RenderJson object={data} />
          </ul>
        </div>
      </div>
    </div>
  )
}

#!/usr/bin/env node
/* Smoke test: import the compiled internals adapters and assert each runtime
   symbol resolves to a non-null value. Catches Payload / @payloadcms/ui
   rename-and-remove breakage at install-time instead of at admin-render time.

   Two adapters, checked separately on purpose:
   - payloadAdapter.js    — server-safe (payload, payload/shared, translations).
                            No CSS stub needed to import this one; it's exactly
                            the module a Payload CLI command's import chain
                            touches, and proving that stays CSS-free is the
                            point (see payloadAdapter.ts's header comment).
   - payloadAdapterUI.js  — @payloadcms/ui only. Needs the CSS stub below,
                            same as before the split.

   Run AFTER `pnpm build` (imports from ./dist/).
   Wire into CI as `pnpm check:internals` or run pre-publish. */

import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

const SERVER_ADAPTER_URL = pathToFileURL(
  resolve(here, '../dist/internal/payloadAdapter.js'),
).href
const UI_ADAPTER_URL = pathToFileURL(
  resolve(here, '../dist/internal/payloadAdapterUI.js'),
).href

const SERVER_RUNTIME_EXPORTED = [
  // from 'payload'
  'docAccessOperation',
  'getFolderData',
  // from 'payload/shared'
  'formatAdminURL',
  'getSafeRedirect',
  'hasDraftsEnabled',
  'mergeListSearchAndWhere',
  // from '@payloadcms/translations' and subpaths
  'enTranslations',
  'deepMergeSimple',
]

const UI_RUNTIME_EXPORTED = [
  // from '@payloadcms/ui'
  'EditUpload',
  'Form',
  'OperationProvider',
  'toast',
  'useAuth',
  'useConfig',
  'useDocumentDrawerContext',
  'useDocumentInfo',
  'useListDrawerContext',
  'useLocale',
  'useServerFunctions',
  'useTranslation',
  'useUploadHandlers',
]

function checkShape(mod, names) {
  const missing = []
  const wrongShape = []
  for (const name of names) {
    if (!(name in mod)) {
      missing.push(name)
      continue
    }
    const v = mod[name]
    const t = typeof v
    // React components are functions or objects (forwardRef); hooks are functions;
    // toast may be a function with attached methods. We just require non-null.
    if (v == null || (t !== 'function' && t !== 'object')) {
      wrongShape.push(`${name} (typeof = ${t})`)
    }
  }
  return { missing, wrongShape }
}

async function importOrFail(label, url) {
  try {
    return await import(url)
  } catch (err) {
    console.error(
      `[check-payload-internals] FAILED to import ${label}.\n` +
        `  Resolved URL: ${url}\n` +
        '  Did you run `pnpm build` first?\n' +
        `  Underlying error: ${err && err.message ? err.message : err}`,
    )
    process.exit(1)
  }
}

// Deliberately imported BEFORE registering the CSS stub: payloadAdapter.js
// must load on bare Node with no help — that's the whole point of the split.
const serverMod = await importOrFail('payloadAdapter.js', SERVER_ADAPTER_URL)

// Stub `.css`/`.scss` imports — @payloadcms/ui transitively imports stylesheets
// that bundlers handle but bare Node cannot. Only needed for the UI adapter.
register('./css-stub-loader.mjs', pathToFileURL(here + '/'))
const uiMod = await importOrFail('payloadAdapterUI.js', UI_ADAPTER_URL)

const serverResult = checkShape(serverMod, SERVER_RUNTIME_EXPORTED)
const uiResult = checkShape(uiMod, UI_RUNTIME_EXPORTED)
const missing = [...serverResult.missing, ...uiResult.missing]
const wrongShape = [...serverResult.wrongShape, ...uiResult.wrongShape]

if (missing.length || wrongShape.length) {
  console.error('[check-payload-internals] FAIL')
  if (missing.length) {
    console.error(
      '  Missing exports (upstream rename or removal?):\n    - ' +
        missing.join('\n    - '),
    )
  }
  if (wrongShape.length) {
    console.error(
      '  Wrong shape (expected function or object):\n    - ' +
        wrongShape.join('\n    - '),
    )
  }
  console.error(
    '\n  Update src/internal/payloadAdapter{,UI}.ts and consumers, then re-run.',
  )
  process.exit(1)
}

const total = SERVER_RUNTIME_EXPORTED.length + UI_RUNTIME_EXPORTED.length
console.log(`[check-payload-internals] OK — ${total} runtime symbols resolved.`)

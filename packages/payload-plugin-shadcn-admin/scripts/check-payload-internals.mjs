#!/usr/bin/env node
/* Smoke test: import the compiled internals adapter and assert each runtime
   symbol resolves to a non-null value. Catches Payload / @payloadcms/ui
   rename-and-remove breakage at install-time instead of at admin-render time.

   Run AFTER `pnpm build` (imports from ./dist/).
   Wire into CI as `pnpm check:internals` or run pre-publish. */

import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// Stub `.css`/`.scss` imports — @payloadcms/ui transitively imports stylesheets
// that bundlers handle but bare Node cannot.
register('./css-stub-loader.mjs', pathToFileURL(here + '/'))

const adapterUrl = pathToFileURL(
  resolve(here, '../dist/internal/payloadAdapter.js'),
).href

const RUNTIME_EXPORTED = [
  // from 'payload'
  'docAccessOperation',
  'getFolderData',
  // from 'payload/shared'
  'formatAdminURL',
  'getSafeRedirect',
  'hasDraftsEnabled',
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
  // from '@payloadcms/translations' and subpaths
  'enTranslations',
  'deepMergeSimple',
]

let mod
try {
  mod = await import(adapterUrl)
} catch (err) {
  console.error(
    '[check-payload-internals] FAILED to import the compiled adapter.\n' +
      `  Resolved URL: ${adapterUrl}\n` +
      '  Did you run `pnpm build` first?\n' +
      `  Underlying error: ${err && err.message ? err.message : err}`,
  )
  process.exit(1)
}

const missing = []
const wrongShape = []
for (const name of RUNTIME_EXPORTED) {
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
    '\n  Update src/internal/payloadAdapter.ts and consumers, then re-run.',
  )
  process.exit(1)
}

console.log(
  `[check-payload-internals] OK — ${RUNTIME_EXPORTED.length} runtime symbols resolved.`,
)

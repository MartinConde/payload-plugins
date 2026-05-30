/* Node ESM loader that resolves `.css` (and `.scss`) imports as empty modules.
   @payloadcms/ui transitively imports stylesheets that bundlers handle but
   bare Node cannot — without this stub, dynamic-importing the adapter for
   the internals smoke test fails with `Unknown file extension ".css"`.

   Registered via the documented `register()` API in check-payload-internals.mjs
   (the older `--experimental-loader` CLI flag is deprecated). */

export async function load(url, context, nextLoad) {
  if (url.endsWith('.css') || url.endsWith('.scss')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export default {}',
    }
  }
  return nextLoad(url, context)
}

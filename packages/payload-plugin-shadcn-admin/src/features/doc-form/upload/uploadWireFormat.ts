/* Shared wire-format helpers for upload-collection writes.

   Both the document-form bridge (AutoDocFormBridge) and the custom
   UploadNewDialog create upload-collection docs the same way: multipart
   form-data with a JSON `_payload` part and a `file` part that is EITHER the
   raw binary File (server-side multipart, the default) OR a metadata-only JSON
   blob when a storage adapter registered a client-direct upload handler (v3.23,
   e.g. R2 with `clientUploads: true`). Keeping that branch in one place stops
   the client-direct path from drifting between the two call sites.

   These functions are intentionally framework-agnostic (no React): the caller
   owns the HTTP method (POST vs PATCH), the `fetch`, and all UI side effects
   (toasts, focus, error state). */

/* The function returned by Payload's `useUploadHandlers().getUploadHandler`.
   When registered for a collection it uploads the file straight to the bucket
   from the browser and returns an opaque `clientUploadContext` the server
   verifies. We type it loosely to avoid coupling to @payloadcms/ui internals. */
export type GetUploadHandler = (args: {
  collectionSlug: string
}) =>
  | ((args: {
      file: File
      updateFilename: (value: string) => void
    }) => Promise<unknown>)
  | null
  | undefined

/* Build the multipart body for an upload-collection write.

   `body` is the full field-values object (serialized into `_payload`). When a
   client-direct handler is registered for `collectionSlug`, the file is uploaded
   to the bucket here and the `file` part becomes metadata-only JSON in the exact
   shape Payload's own `createFormData` produces. Otherwise the raw File is sent.

   Method-agnostic: the caller decides POST (create) vs PATCH (edit). */
export async function buildUploadFormData({
  body,
  file,
  collectionSlug,
  getUploadHandler,
}: {
  body: Record<string, unknown>
  file: File
  collectionSlug: string
  getUploadHandler: GetUploadHandler
}): Promise<FormData> {
  let filePart: File | string = file
  const handler = getUploadHandler({ collectionSlug })
  if (typeof handler === 'function') {
    let filename = file.name
    const clientUploadContext = await handler({
      file,
      updateFilename: (value: string) => {
        filename = value
      },
    })
    filePart = JSON.stringify({
      clientUploadContext,
      collectionSlug,
      filename,
      mimeType: file.type,
      size: file.size,
    })
  }

  const fd = new FormData()
  fd.append('_payload', JSON.stringify(body))
  // String part = client-upload metadata JSON; File = binary.
  fd.append('file', filePart)
  return fd
}

/* Payload returns 4xx validation errors in two shapes:
     1. Flat: { errors: [{ field, message }] }
     2. ValidationError-nested:
        { errors: [{ name: 'ValidationError', message, data: {
            errors: [{ path, message }] } }] }
   Path values may be dotted (myArray.0.label); we preserve them verbatim as the
   error key so subfield renderers can look them up.

   Returns field-keyed messages plus a single `fallback` (the first error that
   had no field, used for a top-level banner). Side effects (setErrors, focus,
   toast) stay with the caller. */
export type ParsedPayloadError = {
  errors?: Array<{
    field?: string
    path?: string
    message?: string
    data?: {
      errors?: Array<{ field?: string; path?: string; message?: string }>
    }
  }>
  message?: string
}

export function parsePayloadErrorResponse(parsed: ParsedPayloadError): {
  fieldErrors: Record<string, string>
  fallback: string | null
} {
  const fieldErrors: Record<string, string> = {}
  let fallback: string | null = null
  const recordField = (name: string | undefined, message: string) => {
    if (name) fieldErrors[name] = message
    else if (!fallback) fallback = message
  }
  for (const err of parsed.errors ?? []) {
    const message = err.message ?? 'Invalid'
    const nested = err.data?.errors
    if (Array.isArray(nested) && nested.length > 0) {
      for (const inner of nested) {
        recordField(inner.path ?? inner.field, inner.message ?? message)
      }
    } else {
      recordField(err.path ?? err.field, message)
    }
  }
  return { fieldErrors, fallback }
}

'use client'

/* The heavy print-area editor, lazy-loaded by PrintAreaInput so its
   window-touching / CSS-pulling imports (fabric, @payloadcms/ui, shadcn
   primitives) never reach the Payload CLI's Node config load. Runs only in the
   browser.

   This file is intentionally tiny: it's pure layout. State, refs, the Fabric
   Canvas lifecycle, and the form-sync rules all live in `EditorContext`. Each
   pane (toolbar, canvas, sidebar tabs) reads what it needs via `useEditor()`. */

import * as React from 'react'
import { ImagePlusIcon } from 'lucide-react'
import { Card, CardContent } from 'payload-plugin-shadcn-ui'

import type { FieldInputProps } from '../adminTypes.js'
import { normalizePrintAreasValue, type PrintAreasValue } from '../printArea.js'
import { EditorCanvas } from './EditorCanvas.js'
import { EditorProvider, useEditor, type EditorBindings } from './EditorContext.js'
import { EditorSidebar } from './EditorSidebar.js'
import { EditorToolbar } from './EditorToolbar.js'

/** Legacy single-mockup mount: bridges `FieldInputProps` into `EditorBindings`
 *  so the original `.input` override on a top-level `printAreas` JSON field
 *  keeps working. Phase 2's products collection no longer mounts this path —
 *  the Designer is the only surface — but the file stays compilable so
 *  consumers can opt back into the raw editor on any JSON field. */
export function PrintAreaEditor(props: FieldInputProps): React.ReactElement {
  const bindings: EditorBindings = React.useMemo(() => {
    const fromCustom = (props.field?.custom as Record<string, unknown> | undefined)?.[
      'plugin-shadcn-admin'
    ] as { mediaCollectionSlug?: string } | undefined
    const mediaSlug = fromCustom?.mediaCollectionSlug || 'media'
    return {
      value: normalizePrintAreasValue(props.value) as PrintAreasValue,
      onChange: props.onChange,
      media: { slug: mediaSlug, fieldPath: 'mockup' },
      disabled: props.disabled,
      lockPerAreaMm: false,
    }
  }, [props.field, props.value, props.onChange, props.disabled])

  return (
    <EditorProvider bindings={bindings}>
      <EditorShell />
    </EditorProvider>
  )
}

/* The shell is a separate component so it can call `useEditor()` (the provider
   has to wrap something before its context is available). */
function EditorShell(): React.ReactElement {
  const { loadState, tr } = useEditor()

  if (loadState === 'no-id') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
          <ImagePlusIcon className="size-6" />
          <p className="text-sm">{tr('pluginProducts:uploadMockupFirst')}</p>
        </CardContent>
      </Card>
    )
  }

  if (loadState === 'error') {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-center text-sm text-destructive">
          {tr('pluginProducts:imageError')}
        </CardContent>
      </Card>
    )
  }

  /* ~65/35 split at md+ (col-span-2 / col-span-1 on a 3-col grid = 67/33),
     stacked below the md breakpoint. Standard Tailwind utilities only — the
     arbitrary `grid-cols-[65fr_35fr]` form was being silently dropped by
     the consumer's JIT scan of the plugin's dist. Toolbar always above the
     canvas pane; sidebar hosts the tabbed settings. */
  return (
    <div className="flex flex-col gap-3">
      <EditorToolbar />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 min-w-0">
          <EditorCanvas />
        </div>
        <div className="md:col-span-1 min-w-0">
          <EditorSidebar />
        </div>
      </div>
    </div>
  )
}

/** Public, host-provided variant: renders the editor against an already-built
 *  bindings object. The Designer uses this so it can drive value/onChange off
 *  the active view's split sub-fields (placement + transform) and the
 *  per-view mockup upload. */
export function PrintAreaEditorWithBindings({
  bindings,
}: {
  bindings: EditorBindings
}): React.ReactElement {
  return (
    <EditorProvider bindings={bindings}>
      <EditorShell />
    </EditorProvider>
  )
}

export { EditorShell }

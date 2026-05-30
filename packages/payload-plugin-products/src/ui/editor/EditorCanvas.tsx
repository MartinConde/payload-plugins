'use client'

/* Container + <canvas> element. Fabric paints both the mockup (now an
   interactive object, not the canvas background) and the print-area rects.
   The wrapping div has `overflow-auto` so a wide canvas can scroll inside its
   pane. ResizeObserver lives in EditorContext and observes this container. */

import * as React from 'react'

import { useEditor } from './EditorContext.js'

export function EditorCanvas(): React.ReactElement {
  const { canvasElRef, containerRef } = useEditor()
  return (
    <div ref={containerRef} className="w-full overflow-auto rounded-lg border bg-muted/20">
      <canvas ref={canvasElRef} />
    </div>
  )
}

'use client'

/* Tiny context exposing the Designer's active (view, color) indices and the
   configured swatch / template slugs. DesignerCanvas owns the state; the
   sync panel, view-level print-area picker, and the chip strip all read it
   instead of receiving props through the canvas → sidebar prop chain.

   Kept separate from EditorContext on purpose: EditorContext is per-row scoped
   and remounts on a view/color switch (`key={`${view}-${color}`}`). Active
   indices must outlive that remount. */

import * as React from 'react'

export type DesignerActive = {
  activeView: number
  activeColor: number
  setActiveView: (i: number) => void
  setActiveColor: (i: number) => void
  colorSwatchesSlug: string
  printTemplatesSlug: string
  mediaCollectionSlug: string
}

const Ctx = React.createContext<DesignerActive | null>(null)

export const DesignerActiveProvider = Ctx.Provider

export function useDesignerActive(): DesignerActive {
  const v = React.useContext(Ctx)
  if (!v) throw new Error('useDesignerActive must be used inside DesignerActiveProvider')
  return v
}

/** Optional accessor — returns null outside a provider (e.g. when the Sync tab
 *  is rendered standalone in a future test). */
export function useDesignerActiveOptional(): DesignerActive | null {
  return React.useContext(Ctx)
}

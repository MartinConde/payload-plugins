'use client'

/* Visual wrapper for adjacent OR-joined chips. Renders a subtle tinted
   background with `or` separators between children. */

import * as React from 'react'

type Props = {
  children: React.ReactNode[]
}

export function OrGroupWrapper({ children }: Props): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1 py-0.5">
      {children.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              or
            </span>
          )}
          {child}
        </React.Fragment>
      ))}
    </span>
  )
}

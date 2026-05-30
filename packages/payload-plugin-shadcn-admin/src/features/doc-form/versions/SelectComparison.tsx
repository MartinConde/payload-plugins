'use client'

/* "Compare against" selector for the version diff view. Writes the chosen
   version id to `?versionFrom=` and lets the RSC refetch + rebuild the diff.
   Options are computed server-side (previous version / currently published /
   specific prior versions). v3.9. */

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'payload-plugin-shadcn-ui'

export type ComparisonOption = { value: string; label: string }

export type SelectComparisonProps = {
  options: ComparisonOption[]
  /** Currently selected `?versionFrom=` value, or null for the default
   *  (previous version). */
  selected: string | null
}

const PREVIOUS = '__previous__'

export function SelectComparison({
  options,
  selected,
}: SelectComparisonProps): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === PREVIOUS) params.delete('versionFrom')
    else params.set('versionFrom', value)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Compare against</span>
      <Select value={selected ?? PREVIOUS} onValueChange={onChange}>
        <SelectTrigger className="w-64" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PREVIOUS}>Previous version</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

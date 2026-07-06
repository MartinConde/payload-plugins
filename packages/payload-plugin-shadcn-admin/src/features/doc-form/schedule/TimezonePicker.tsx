'use client'

/* Searchable timezone combobox for SchedulePublishPopover's "Timezone" row.
   Split out since it's a fully self-contained Popover+Command widget with no
   dependency on the parent's schedule/upcoming-jobs state. */

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from 'payload-plugin-shadcn-ui'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'payload-plugin-shadcn-ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'payload-plugin-shadcn-ui'
import { cn } from 'payload-plugin-shadcn-ui'

export function TimezonePicker({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  options: { label: string; value: string }[]
  disabled?: boolean
}): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const selectedLabel = options.find((tz) => tz.value === value)?.label ?? value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search timezone…" />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {options.map((tz) => (
                <CommandItem
                  key={tz.value}
                  value={tz.label}
                  onSelect={() => {
                    onChange(tz.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('size-4', value === tz.value ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="truncate">{tz.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

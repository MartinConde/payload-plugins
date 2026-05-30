'use client'

import * as React from 'react'
import { ChevronRight } from 'lucide-react'

import { cn } from 'payload-plugin-shadcn-ui'

/* shadcn-styled reimplementation of Payload's `RenderJSON` recursive JSON tree
   (node_modules/@payloadcms/next/dist/views/API/RenderJSON). Behavior is 1:1:
   per-node open/closed state, bracket rendering with trailing commas, the same
   value typing (null/date/array/object/number/boolean/string, Date → ISO), and
   empty-collection collapse. Only the chrome differs — Tailwind tokens + a
   lucide chevron instead of Payload's admin CSS. Used by ApiInspector. */

type ParentType = 'array' | 'object'

type BracketProps = {
  type: ParentType
  position: 'end' | 'start'
  comma?: boolean
}

function Bracket({ type, position, comma = false }: BracketProps) {
  const bracket =
    position === 'end'
      ? type === 'object'
        ? '}'
        : ']'
      : type === 'object'
        ? '{'
        : '['
  return (
    <span className="text-muted-foreground">
      {bracket}
      {position === 'end' && comma ? ',' : null}
    </span>
  )
}

type RenderJsonProps = {
  object: unknown
  objectKey?: string
  parentType?: ParentType
  isEmpty?: boolean
  trailingComma?: boolean
}

type ValueType =
  | 'array'
  | 'boolean'
  | 'date'
  | 'null'
  | 'number'
  | 'object'
  | 'string'

const valueColor: Record<ValueType, string> = {
  array: '',
  object: '',
  string: 'text-emerald-600 dark:text-emerald-400',
  number: 'text-amber-600 dark:text-amber-400',
  boolean: 'text-blue-600 dark:text-blue-400',
  null: 'text-blue-600 dark:text-blue-400',
  date: 'text-emerald-600 dark:text-emerald-400',
}

export function RenderJson({
  object,
  objectKey,
  parentType = 'object',
  isEmpty = false,
  trailingComma = false,
}: RenderJsonProps) {
  const objectKeys =
    object && typeof object === 'object' ? Object.keys(object) : []
  const objectLength = objectKeys.length
  const [isOpen, setIsOpen] = React.useState(true)
  const isNested = parentType === 'object' || parentType === 'array'

  return (
    <li className={cn('list-none', isNested && 'ml-4')}>
      <button
        aria-label="toggle"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-1 text-left hover:opacity-80',
          isEmpty && 'cursor-default',
        )}
      >
        {isEmpty ? null : (
          <ChevronRight
            className={cn(
              'size-3 shrink-0 text-muted-foreground transition-transform',
              isOpen && 'rotate-90',
            )}
          />
        )}
        <span className={cn(isEmpty && 'ml-4')}>
          {objectKey && <span className="text-foreground">{`"${objectKey}": `}</span>}
          <Bracket position="start" type={parentType} />
          {isEmpty ? <Bracket comma={trailingComma} position="end" type={parentType} /> : null}
        </span>
      </button>

      <ul className={cn('border-l border-border', isNested && 'ml-1.5')}>
        {isOpen &&
          object &&
          typeof object === 'object' &&
          objectKeys.map((key, keyIndex) => {
            let value = (object as Record<string, unknown>)[key]
            let type: ValueType
            const isLastKey = keyIndex === objectLength - 1

            if (value === null) {
              type = 'null'
            } else if (value instanceof Date) {
              type = 'date'
              value = value.toISOString()
            } else if (Array.isArray(value)) {
              type = 'array'
            } else if (typeof value === 'object') {
              type = 'object'
            } else if (typeof value === 'number') {
              type = 'number'
            } else if (typeof value === 'boolean') {
              type = 'boolean'
            } else {
              type = 'string'
            }

            if (type === 'object' || type === 'array') {
              const v = value as Record<string, unknown> | unknown[]
              return (
                <RenderJson
                  key={`${key}-${keyIndex}`}
                  isEmpty={
                    Array.isArray(v)
                      ? v.length === 0
                      : Object.keys(v).length === 0
                  }
                  object={v}
                  objectKey={parentType === 'object' ? key : undefined}
                  parentType={type}
                  trailingComma={!isLastKey}
                />
              )
            }

            const parentHasKey = Boolean(parentType === 'object' && key)
            return (
              <li
                key={`${key}-${keyIndex}`}
                className={cn('list-none', objectKey ? 'ml-4' : 'ml-4')}
              >
                {parentHasKey ? (
                  <span className="text-foreground">{`"${key}": `}</span>
                ) : null}
                <span className={valueColor[type]}>{JSON.stringify(value)}</span>
                {isLastKey ? '' : ','}
              </li>
            )
          })}
      </ul>

      {!isEmpty && (
        <span className={cn(isNested && 'ml-4')}>
          <Bracket comma={trailingComma} position="end" type={parentType} />
        </span>
      )}
    </li>
  )
}

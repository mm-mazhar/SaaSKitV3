// components/cyber/terminal-card.tsx

import { cn } from '@/lib/utils'
import * as React from 'react'

interface TerminalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shown in the title bar, e.g. `~/saas-kit — zsh`. */
  title?: string
  bodyClassName?: string
}

/** Card styled as a terminal window: title bar with window dots, monospace body. */
export function TerminalCard({ title, className, bodyClassName, children, ...props }: TerminalCardProps) {
  return (
    <div
      data-slot='terminal-card'
      className={cn(
        'cyber-chamfer cyber-edge bg-background text-card-foreground relative flex flex-col overflow-hidden rounded-xl border',
        className
      )}
      {...props}
    >
      <div className='bg-card flex h-9 shrink-0 items-center gap-2 border-b px-4'>
        <span aria-hidden='true' className='flex gap-1.5'>
          <span className='bg-destructive size-2.5 rounded-full' />
          <span className='bg-chart-4 size-2.5 rounded-full' />
          <span className='bg-neon size-2.5 rounded-full' />
        </span>
        {title ? (
          <span className='font-label text-muted-foreground ml-2 truncate text-xs tracking-[0.2em] uppercase'>
            {title}
          </span>
        ) : null}
      </div>
      <div className={cn('flex-1 p-4 font-mono text-sm leading-relaxed', bodyClassName)}>{children}</div>
    </div>
  )
}

interface TerminalLineProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Leading prompt glyph. `null` renders an output line with no prompt. */
  prompt?: '>' | '$' | '#' | null
  tone?: 'default' | 'muted' | 'success' | 'error'
}

const TONE_CLASS: Record<NonNullable<TerminalLineProps['tone']>, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  success: 'text-neon',
  error: 'text-destructive',
}

/** One line of terminal output inside a `TerminalCard`. */
export function TerminalLine({ prompt = '>', tone = 'default', className, children, ...props }: TerminalLineProps) {
  return (
    <p className={cn('break-words', TONE_CLASS[tone], className)} {...props}>
      {prompt ? (
        <span aria-hidden='true' className='text-neon mr-2 select-none'>
          {prompt}
        </span>
      ) : null}
      {children}
    </p>
  )
}

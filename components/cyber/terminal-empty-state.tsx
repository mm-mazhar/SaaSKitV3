// components/cyber/terminal-empty-state.tsx

import { IconFrame } from '@/components/cyber/icon-frame'
import { TerminalCard, TerminalLine } from '@/components/cyber/terminal-card'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'
import * as React from 'react'

interface TerminalEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  /** Terminal-style readout of the empty query, e.g. `0 workspaces found`. */
  readout: string
  /** Title bar path, e.g. `~/workspaces`. */
  path?: string
  action?: React.ReactNode
  className?: string
}

/** Empty collection state framed as a terminal query that came back with nothing. */
export function TerminalEmptyState({
  icon: Icon,
  title,
  description,
  readout,
  path,
  action,
  className,
}: TerminalEmptyStateProps) {
  return (
    <TerminalCard title={path} className={cn('border-dashed', className)} bodyClassName='p-6'>
      <TerminalLine prompt='$' tone='muted' className='text-xs'>
        {readout}
      </TerminalLine>
      <div className='flex min-h-[280px] flex-col items-center justify-center gap-4 text-center'>
        <IconFrame>
          <Icon />
        </IconFrame>
        <h3 className='text-lg font-semibold'>{title}</h3>
        <p className='text-muted-foreground max-w-sm text-sm'>{description}</p>
        {action}
      </div>
    </TerminalCard>
  )
}

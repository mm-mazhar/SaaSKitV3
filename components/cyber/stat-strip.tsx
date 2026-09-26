// components/cyber/stat-strip.tsx

import { cn } from '@/lib/utils'

export interface Stat {
  label: string
  value: string
  hint?: string
}

interface StatStripProps {
  stats: Stat[]
  className?: string
}

/**
 * Readout row of key figures. 2×2 on mobile (divider between columns, rule under
 * the first row), a single row with vertical dividers from `md`. Built for four stats.
 */
export function StatStrip({ stats, className }: StatStripProps) {
  return (
    <dl className={cn('grid grid-cols-2 border-y md:grid-cols-4', className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className='flex flex-col gap-2 px-4 py-6 even:border-l max-md:[&:nth-child(-n+2)]:border-b md:px-6 md:[&:not(:first-child)]:border-l'
        >
          <dt className='font-label text-muted-foreground text-xs tracking-[0.2em] uppercase'>{stat.label}</dt>
          <dd className='font-heading text-neon text-3xl font-bold md:text-4xl'>{stat.value}</dd>
          {stat.hint ? <dd className='text-muted-foreground text-xs'>{stat.hint}</dd> : null}
        </div>
      ))}
    </dl>
  )
}

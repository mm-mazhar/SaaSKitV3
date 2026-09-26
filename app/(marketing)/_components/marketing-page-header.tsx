// app/(marketing)/_components/marketing-page-header.tsx

import { CircuitGrid } from '@/components/cyber/circuit-grid'
import { CyberLabel } from '@/components/cyber/cyber-label'
import { cn } from '@/lib/utils'
import * as React from 'react'

interface MarketingPageHeaderProps {
  label: string
  title: string
  description?: React.ReactNode
  className?: string
}

/** Page intro for secondary marketing pages: eyebrow, h1, lede over a faded grid. */
export function MarketingPageHeader({ label, title, description, className }: MarketingPageHeaderProps) {
  return (
    <header className={cn('relative isolate flex flex-col items-center gap-5 px-4 pb-12 text-center', className)}>
      <CircuitGrid className='-top-32' />
      <CyberLabel>{label}</CyberLabel>
      <h1 className='text-4xl font-black text-balance md:text-6xl'>{title}</h1>
      {description ? <p className='text-muted-foreground max-w-2xl leading-relaxed md:text-lg'>{description}</p> : null}
    </header>
  )
}

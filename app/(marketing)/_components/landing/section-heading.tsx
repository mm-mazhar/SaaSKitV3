// app/(marketing)/_components/landing/section-heading.tsx

import { CyberLabel } from '@/components/cyber/cyber-label'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  index: string
  label: string
  title: string
  description?: string
  align?: 'center' | 'start'
  className?: string
}

/** Eyebrow + h2 + lede used by every landing section. */
export function SectionHeading({ index, label, title, description, align = 'center', className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex max-w-3xl flex-col gap-4',
        align === 'center' ? 'mx-auto items-center text-center' : 'items-start text-left',
        className
      )}
    >
      <CyberLabel index={index}>{label}</CyberLabel>
      <h2 className='text-3xl font-bold text-balance md:text-4xl lg:text-5xl'>{title}</h2>
      {description ? <p className='text-muted-foreground leading-relaxed md:text-lg'>{description}</p> : null}
    </div>
  )
}

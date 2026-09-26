// components/cyber/cyber-label.tsx

import { cn } from '@/lib/utils'
import * as React from 'react'

interface CyberLabelProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Optional index shown before the label, e.g. `01`. */
  index?: string
}

/** Section eyebrow in HUD style: `// 01 FEATURES`. */
export function CyberLabel({ index, className, children, ...props }: CyberLabelProps) {
  return (
    <p className={cn('font-label text-neon text-xs tracking-[0.2em] uppercase', className)} {...props}>
      <span aria-hidden='true' className='text-muted-foreground'>
        {'// '}
        {index ? `${index} ` : null}
      </span>
      {children}
    </p>
  )
}

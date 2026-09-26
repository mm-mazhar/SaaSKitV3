// components/cyber/glitch-heading.tsx

import { cn } from '@/lib/utils'
import * as React from 'react'

interface GlitchHeadingProps extends Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'> {
  as?: 'h1' | 'h2' | 'h3'
  /** Plain text only: the glitch layers are CSS copies of it via `data-text`. */
  children: string
}

/**
 * Heading with static chromatic aberration and an occasional slice/skew glitch.
 * The effect is scoped to `.theme-cyber` (see app/styles/theme-cyber.css);
 * under other schemes this renders as a normal heading.
 */
export function GlitchHeading({ as: Tag = 'h1', className, children, ...props }: GlitchHeadingProps) {
  return (
    <Tag data-text={children} className={cn('cyber-glitch', className)} {...props}>
      {children}
    </Tag>
  )
}

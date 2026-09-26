// components/cyber/icon-frame.tsx

import { cn } from '@/lib/utils'
import * as React from 'react'

const TONE_CLASS = {
  neon: 'text-neon border-neon/40 bg-neon/5',
  secondary: 'text-neon-secondary border-neon-secondary/40 bg-neon-secondary/5',
  tertiary: 'text-neon-tertiary border-neon-tertiary/40 bg-neon-tertiary/5',
} as const

interface IconFrameProps {
  children: React.ReactNode
  tone?: keyof typeof TONE_CLASS
  className?: string
}

/**
 * Chamfered square that houses a lucide icon at the thin technical stroke weight.
 * Icons glow on hover of the frame or any `group` ancestor (theme-cyber.css).
 */
export function IconFrame({ children, tone = 'neon', className }: IconFrameProps) {
  return (
    <span
      data-slot='icon-frame'
      className={cn(
        'cyber-chamfer-sm cyber-edge inline-flex size-11 shrink-0 items-center justify-center rounded-md border [--edge:currentColor] [&_svg]:stroke-[1.5] [&_svg:not([class*=size-])]:size-5',
        TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

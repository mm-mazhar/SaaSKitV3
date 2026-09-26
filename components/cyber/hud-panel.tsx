// components/cyber/hud-panel.tsx

import { cn } from '@/lib/utils'
import * as React from 'react'

interface HudPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Small caps label in the panel header, e.g. `SYS.STATUS`. */
  label?: string
}

const CORNER = 'border-neon absolute size-3'

/**
 * Holographic HUD panel: translucent, blurred, neon-bordered, with bracket corners.
 * Deliberately not chamfered. The clip would cut off the outer glow and the corner
 * brackets, which are what give it the heads-up-display read.
 */
export function HudPanel({ label, className, children, ...props }: HudPanelProps) {
  return (
    <div
      data-slot='hud-panel'
      className={cn(
        'bg-muted/30 border-neon/30 shadow-neon relative rounded-lg border p-5 backdrop-blur-md',
        className
      )}
      {...props}
    >
      <span aria-hidden='true' className={cn(CORNER, '-top-px -left-px border-t-2 border-l-2')} />
      <span aria-hidden='true' className={cn(CORNER, '-top-px -right-px border-t-2 border-r-2')} />
      <span aria-hidden='true' className={cn(CORNER, '-bottom-px -left-px border-b-2 border-l-2')} />
      <span aria-hidden='true' className={cn(CORNER, '-right-px -bottom-px border-r-2 border-b-2')} />
      {label ? (
        <p className='font-label text-neon mb-3 text-xs tracking-[0.2em] uppercase'>{`// ${label}`}</p>
      ) : null}
      {children}
    </div>
  )
}

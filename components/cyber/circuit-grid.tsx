// components/cyber/circuit-grid.tsx

import { cn } from '@/lib/utils'
import * as React from 'react'

interface CircuitGridProps {
  /** `grid` is a plain HUD grid; `circuit` adds PCB traces on top of it. */
  pattern?: 'grid' | 'circuit'
  /** Radially fade the pattern out towards the edges. */
  fade?: boolean
  /** Low-opacity neon gradient mesh in opposite corners. */
  mesh?: boolean
  className?: string
}

// Read the raw token (not the inlined Tailwind theme value) so every scheme tints the lines.
const LINE = 'color-mix(in srgb, var(--neon, var(--primary)) 5%, transparent)'

const GRID_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
  backgroundSize: '50px 50px',
}

const FADE_STYLE: React.CSSProperties = {
  maskImage: 'radial-gradient(ellipse at center, #000 35%, transparent 80%)',
}

const MESH_STYLE: React.CSSProperties = {
  backgroundImage: [
    'radial-gradient(40% 50% at 0% 0%, color-mix(in srgb, var(--neon, var(--primary)) 10%, transparent), transparent)',
    'radial-gradient(40% 50% at 100% 100%, color-mix(in srgb, var(--neon-secondary, var(--primary)) 8%, transparent), transparent)',
  ].join(', '),
}

/**
 * Decorative tech background. Absolutely positioned, so place it inside a
 * `relative` (ideally `isolate`) container, before the content.
 */
export function CircuitGrid({ pattern = 'grid', fade = true, mesh = false, className }: CircuitGridProps) {
  const patternId = React.useId()

  return (
    <div aria-hidden='true' className={cn('pointer-events-none absolute inset-0 -z-10', className)}>
      {mesh ? <div className='absolute inset-0' style={MESH_STYLE} /> : null}
      <div className='absolute inset-0' style={fade ? { ...GRID_STYLE, ...FADE_STYLE } : GRID_STYLE}>
        {pattern === 'circuit' ? (
          <svg className='text-neon absolute inset-0 size-full opacity-15'>
            <defs>
              <pattern id={patternId} width='160' height='160' patternUnits='userSpaceOnUse'>
                <g fill='none' stroke='currentColor' strokeWidth='1'>
                  <path d='M0 40H40L56 56H100V88L112 100H160' />
                  <path d='M160 40H130L118 28V0' />
                  <path d='M20 160V120L36 104H72' />
                  <path d='M160 120H124L108 136V160' />
                  <path d='M80 0V20' />
                  <path d='M0 100H24' />
                </g>
                <g fill='currentColor'>
                  <circle cx='100' cy='56' r='2.5' />
                  <circle cx='72' cy='104' r='2.5' />
                  <circle cx='80' cy='20' r='2.5' />
                  <circle cx='24' cy='100' r='2.5' />
                </g>
              </pattern>
            </defs>
            <rect width='100%' height='100%' fill={`url(#${patternId})`} />
          </svg>
        ) : null}
      </div>
    </div>
  )
}

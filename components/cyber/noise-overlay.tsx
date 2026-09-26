// components/cyber/noise-overlay.tsx

import { cn } from '@/lib/utils'

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/**
 * Static signal noise. Only rendered under `.theme-cyber` (`cyber-only`): film grain
 * reads as dirt on light schemes. Place inside a `relative` container.
 */
export function NoiseOverlay({ className }: { className?: string }) {
  return (
    <div
      aria-hidden='true'
      className={cn('cyber-only pointer-events-none absolute inset-0 opacity-[0.06]', className)}
      style={{ backgroundImage: NOISE_SVG }}
    />
  )
}

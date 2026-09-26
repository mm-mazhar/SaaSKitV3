// components/cyber/blinking-cursor.tsx

import { cn } from '@/lib/utils'

/** Terminal block cursor. Decorative, so hidden from assistive tech. */
export function BlinkingCursor({ className }: { className?: string }) {
  return (
    <span
      aria-hidden='true'
      className={cn(
        'animate-blink ml-0.5 inline-block h-[1em] w-[0.55ch] translate-y-[0.15em] bg-current',
        className
      )}
    />
  )
}

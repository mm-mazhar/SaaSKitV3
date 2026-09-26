// components/cyber/cyber-input.tsx

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import * as React from 'react'

type CyberInputProps = React.ComponentProps<typeof Input> & {
  /** Terminal prompt glyph rendered before the value. */
  prompt?: string
  wrapperClassName?: string
}

/**
 * Terminal-prompt input. Builds on the shared `Input`, so chamfer, focus and
 * colours come from the scheme; this only adds the prompt and a 44px touch target.
 */
export function CyberInput({ prompt = '>', className, wrapperClassName, ...props }: CyberInputProps) {
  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      {/* z-10: the scheme's clip-path gives the input its own stacking context, which would paint over the prompt. */}
      <span
        aria-hidden='true'
        className='text-neon pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 font-mono text-sm'
      >
        {prompt}
      </span>
      <Input className={cn('h-11 pl-8 font-mono', className)} {...props} />
    </div>
  )
}

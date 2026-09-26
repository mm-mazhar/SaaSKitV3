// components/cyber/typewriter-text.tsx

'use client'

import { BlinkingCursor } from '@/components/cyber/blinking-cursor'
import { cn } from '@/lib/utils'
import { useReducedMotion } from 'motion/react'
import * as React from 'react'

interface TypewriterTextProps {
  text: string
  /** Milliseconds per character. */
  speed?: number
  /** Milliseconds before the first character appears. */
  startDelay?: number
  cursor?: boolean
  className?: string
}

/**
 * Types `text` out character by character.
 *
 * The full string is always in the DOM for screen readers and crawlers, and the
 * untyped remainder is rendered invisibly so the line never reflows while typing.
 * Reduced-motion users get the full text immediately.
 */
export function TypewriterText({
  text,
  speed = 35,
  startDelay = 0,
  cursor = true,
  className,
}: TypewriterTextProps) {
  const reduceMotion = useReducedMotion()
  const [typed, setTyped] = React.useState(0)

  React.useEffect(() => {
    let count = 0
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      count = reduceMotion ? text.length : count + 1
      setTyped(count)
      if (count < text.length) timer = setTimeout(tick, speed)
    }

    timer = setTimeout(tick, reduceMotion ? 0 : startDelay)
    return () => clearTimeout(timer)
  }, [text, speed, startDelay, reduceMotion])

  return (
    <span className={cn('font-mono', className)}>
      <span className='sr-only'>{text}</span>
      <span aria-hidden='true'>
        {text.slice(0, typed)}
        {cursor ? <BlinkingCursor /> : null}
        <span className='invisible'>{text.slice(typed)}</span>
      </span>
    </span>
  )
}

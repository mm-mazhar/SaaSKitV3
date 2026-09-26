// components/cyber/cyber-button.tsx

import { cn } from '@/lib/utils'
import { Slot, Slottable } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const cyberButtonVariants = cva(
  'group/cyber-button font-label relative isolate inline-flex shrink-0 items-center justify-center gap-2 tracking-[0.15em] whitespace-nowrap uppercase transition-[color,filter] duration-150 outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        primary: 'text-neon hover:text-background',
        secondary: 'text-neon-secondary hover:text-background',
        outline: 'text-foreground hover:text-neon',
        ghost: 'text-muted-foreground hover:text-neon',
        glitch: 'text-background hover:brightness-110',
      },
      size: {
        sm: 'h-9 px-4 text-xs',
        default: 'h-11 px-6 text-sm',
        lg: 'h-12 px-8 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

/*
 * Classes are spelled out in full (no interpolation) so Tailwind's scanner can see them.
 *
 * Fill and border live on this clipped plate rather than the button itself.
 * The button stays unclipped, so its drop-shadow glow (theme-cyber.css) follows
 * the chamfer instead of being cut off by it.
 */
const plateVariants = cva(
  'cyber-chamfer-sm cyber-edge absolute inset-0 -z-10 rounded-md border transition-colors duration-150 group-focus-visible/cyber-button:shadow-[inset_0_0_0_1px_var(--ring),inset_0_0_0_3px_var(--background)]',
  {
    variants: {
      variant: {
        primary: 'border-neon border-2 [--edge-width:2px] [--edge:var(--neon,var(--primary))] group-hover/cyber-button:bg-neon',
        secondary: 'border-neon-secondary border-2 [--edge-width:2px] [--edge:var(--neon-secondary,var(--primary))] group-hover/cyber-button:bg-neon-secondary',
        outline: 'border-border group-hover/cyber-button:border-neon group-hover/cyber-button:[--edge:var(--neon,var(--primary))]',
        ghost: 'group-hover/cyber-button:bg-neon/10 border-transparent [--edge:transparent]',
        glitch: 'bg-neon border-transparent [--edge:transparent]',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
)

type CyberButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof cyberButtonVariants> & {
    asChild?: boolean
  }

/**
 * Marketing-grade neon button: chamfered, glowing, 44px touch target by default.
 * For dense product UI prefer `components/ui/button`, which the scheme already restyles.
 */
function CyberButton({ className, variant, size, asChild = false, children, ...props }: CyberButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot='cyber-button'
      data-variant={variant ?? 'primary'}
      className={cn(cyberButtonVariants({ variant, size }), className)}
      {...props}
    >
      <span aria-hidden='true' className={plateVariants({ variant })} />
      <Slottable>{children}</Slottable>
    </Comp>
  )
}

export { CyberButton, cyberButtonVariants }

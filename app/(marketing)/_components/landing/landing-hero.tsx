// app/(marketing)/_components/landing/landing-hero.tsx

import { CircuitGrid } from '@/components/cyber/circuit-grid'
import { CyberButton } from '@/components/cyber/cyber-button'
import { CyberLabel } from '@/components/cyber/cyber-label'
import { GlitchHeading } from '@/components/cyber/glitch-heading'
import { HudPanel } from '@/components/cyber/hud-panel'
import { IconFrame } from '@/components/cyber/icon-frame'
import { NoiseOverlay } from '@/components/cyber/noise-overlay'
import { TerminalLine } from '@/components/cyber/terminal-card'
import { TypewriterText } from '@/components/cyber/typewriter-text'
import { MARKETING_SURFACE_MAX_WIDTH } from '@/components/page-section'
import { APP_DESCRIPTION, APP_DESCRIPTION_LONG, APP_SLOGAN } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ArrowRight, Building2, CreditCard, UserPlus, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

type FeedEvent = {
  icon: LucideIcon
  tone: 'neon' | 'secondary' | 'tertiary'
  kind: string
  title: string
  detail: string
}

// Illustrative product events: what the kit does for a new team in its first hour.
const FEED_EVENTS: FeedEvent[] = [
  {
    icon: Building2,
    tone: 'neon',
    kind: 'workspace.created',
    title: '"Client Onboarding" created',
    detail: 'Scoped to plan limits automatically.',
  },
  {
    icon: UserPlus,
    tone: 'tertiary',
    kind: 'invite.sent',
    title: 'Admin access · 2 workspaces',
    detail: 'Teammates get exactly what they need.',
  },
  {
    icon: CreditCard,
    tone: 'secondary',
    kind: 'billing.upgraded',
    title: 'Upgraded to Team plan',
    detail: 'Limits and credits updated.',
  },
]

interface LandingHeroProps {
  isAuthenticated: boolean
}

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  return (
    <section className='relative isolate overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32'>
      <CircuitGrid pattern='circuit' mesh />
      <NoiseOverlay />
      {/* Fade the backdrop out so the overlapping product preview has no seam. */}
      <div aria-hidden='true' className='to-background absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-b from-transparent' />

      <div
        className={cn(
          'mx-auto grid items-center gap-12 px-4 sm:px-6 lg:grid-cols-[3fr_2fr] lg:gap-16 lg:px-8',
          MARKETING_SURFACE_MAX_WIDTH
        )}
      >
        <div className='flex min-w-0 flex-col items-start gap-8'>
          <CyberLabel>{APP_SLOGAN}</CyberLabel>
          <GlitchHeading className='text-5xl leading-[1.05] font-black tracking-wider text-balance md:text-7xl xl:text-8xl'>
            {APP_DESCRIPTION}
          </GlitchHeading>
          <p className='text-muted-foreground max-w-xl text-base leading-relaxed md:text-lg xl:text-xl'>
            <TypewriterText text={APP_DESCRIPTION_LONG} startDelay={400} speed={18} />
          </p>
          <div className='flex flex-wrap gap-4'>
            <CyberButton asChild variant='glitch' size='lg'>
              <Link href={isAuthenticated ? '/dashboard' : '/get-started'}>
                {isAuthenticated ? 'Dashboard' : 'Get Started'}
                <ArrowRight />
              </Link>
            </CyberButton>
            <CyberButton asChild variant='outline' size='lg'>
              <Link href='#pricing'>View pricing</Link>
            </CyberButton>
          </div>
        </div>

        <HudPanel label='live.feed' className='hidden lg:block'>
          <ol className='flex flex-col divide-y'>
            {FEED_EVENTS.map((event) => (
              <li key={event.kind} className='flex items-start gap-4 py-4 first:pt-0'>
                <IconFrame tone={event.tone}>
                  <event.icon />
                </IconFrame>
                <div className='min-w-0'>
                  <p className='font-label text-muted-foreground text-xs tracking-[0.2em] uppercase'>{event.kind}</p>
                  <p className='text-foreground mt-1 text-sm font-semibold'>{event.title}</p>
                  <p className='text-muted-foreground mt-1 text-xs'>{event.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <TerminalLine tone='success' className='mt-2 border-t pt-4 text-xs'>
            all systems nominal
          </TerminalLine>
        </HudPanel>
      </div>
    </section>
  )
}

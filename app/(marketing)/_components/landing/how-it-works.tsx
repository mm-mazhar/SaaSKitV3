// app/(marketing)/_components/landing/how-it-works.tsx

import { SectionHeading } from '@/app/(marketing)/_components/landing/section-heading'
import { BlinkingCursor } from '@/components/cyber/blinking-cursor'
import { CyberButton } from '@/components/cyber/cyber-button'
import { TerminalCard, TerminalLine } from '@/components/cyber/terminal-card'
import { MARKETING_SURFACE_MAX_WIDTH, PageSection } from '@/components/page-section'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const STEPS = [
  {
    title: 'Spin up an organization',
    points: [
      'Sign up and an organization is created automatically.',
      "Add your first workspace within the free plan's limit.",
      'Everything is scoped to your organization from the start.',
    ],
  },
  {
    title: 'Invite your team, assign workspaces',
    points: [
      'Invite admins and members by email.',
      'Choose exactly which workspaces each person can access.',
      'Change roles and access at any time.',
    ],
  },
  {
    title: 'Turn on billing and ship',
    points: [
      'Pick a plan and let Stripe handle checkout and renewals.',
      'Workspace limits and credits update automatically per plan.',
      'Focus on your product instead of billing plumbing.',
    ],
  },
]

// An event log of the steps above, not shell commands: the kit has no CLI.
const BOOT_LOG: { time: string; event: string; detail: string; ok?: boolean }[] = [
  { time: '00:00:01', event: 'user.signup', detail: 'you@company.com' },
  { time: '00:00:01', event: 'org.created', detail: '"your-company" · owner: you', ok: true },
  { time: '00:00:02', event: 'workspace.created', detail: '"default" · plan: free', ok: true },
  { time: '00:04:37', event: 'invite.sent', detail: 'admin@company.com · role: ADMIN · 2 workspaces' },
  { time: '00:05:12', event: 'invite.accepted', detail: 'access scoped to 2 workspaces', ok: true },
  { time: '00:12:48', event: 'billing.checkout', detail: 'stripe · plan: team' },
  { time: '00:12:51', event: 'plan.applied', detail: 'workspace limits + credits updated', ok: true },
]

interface HowItWorksProps {
  isAuthenticated: boolean
}

export function HowItWorks({ isAuthenticated }: HowItWorksProps) {
  return (
    <PageSection id='how-it-works' className='scroll-mt-24 py-24 md:py-32'>
      <div className={cn('mx-auto grid items-start gap-12 lg:grid-cols-2 lg:gap-16', MARKETING_SURFACE_MAX_WIDTH)}>
        <div className='flex flex-col gap-10'>
          <SectionHeading
            index='02'
            label='Boot sequence'
            title='How it works'
            description='From signup to your first paying customer, in three steps.'
            align='start'
          />

          <ol className='flex flex-col gap-8'>
            {STEPS.map((step, index) => (
              <li key={step.title} className='grid grid-cols-[3.25rem_1fr] gap-x-4 gap-y-2'>
                <span aria-hidden='true' className='font-heading text-neon row-span-2 text-3xl font-bold'>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className='text-lg font-semibold'>{step.title}</h3>
                <ul className='text-muted-foreground flex flex-col gap-1.5 text-sm'>
                  {step.points.map((point) => (
                    <li key={point} className='flex gap-2'>
                      <span aria-hidden='true' className='text-neon'>
                        {'>'}
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <CyberButton asChild className='self-start'>
            <Link href={isAuthenticated ? '/dashboard' : '/get-started'}>
              {isAuthenticated ? 'Dashboard' : 'Get Started'}
            </Link>
          </CyberButton>
        </div>

        <TerminalCard title='~/your-saas — boot.log' className='lg:sticky lg:top-28' bodyClassName='flex flex-col gap-2 text-xs md:text-sm'>
          {BOOT_LOG.map((entry) => (
            <TerminalLine key={`${entry.time}-${entry.event}`} prompt={null} tone='muted'>
              <span className='text-muted-foreground'>[{entry.time}]</span>{' '}
              <span className={entry.ok ? 'text-neon' : 'text-foreground'}>{entry.event}</span>{' '}
              <span>{entry.detail}</span>
            </TerminalLine>
          ))}
          <TerminalLine tone='success' className='mt-2'>
            ready to ship
            <BlinkingCursor />
          </TerminalLine>
        </TerminalCard>
      </div>
    </PageSection>
  )
}

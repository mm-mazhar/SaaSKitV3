// app/(marketing)/_components/landing/feature-grid.tsx

import { SectionHeading } from '@/app/(marketing)/_components/landing/section-heading'
import { CircuitGrid } from '@/components/cyber/circuit-grid'
import { IconFrame } from '@/components/cyber/icon-frame'
import { MARKETING_SURFACE_MAX_WIDTH, PageSection } from '@/components/page-section'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Building2, CreditCard, Layers, Lock, ShieldCheck, Zap, type LucideIcon } from 'lucide-react'

type Feature = {
  icon: LucideIcon
  title: string
  body: string
  tags?: string[]
  /** Spans two rows on large screens, which staggers the grid's card heights. */
  featured?: boolean
  /** Spans the full row so the last row closes flush (featured fills 2 cells, 4 singles). */
  wide?: boolean
}

const FEATURES: Feature[] = [
  {
    icon: Building2,
    title: 'Multi-tenant by default',
    body: "Every user belongs to one or more organizations, and every organization can spin up workspaces scoped to its pricing plan. It's the multi-tenant foundation most teams spend weeks building — here from the first commit.",
    tags: ['Organizations', 'Workspaces', 'Plan-based limits'],
    featured: true,
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access control',
    body: 'Owner, Admin, and Member roles out of the box — plus per-workspace access grants, so an admin can hand a teammate exactly the workspaces they need and nothing else.',
  },
  {
    icon: CreditCard,
    title: 'Stripe billing built in',
    body: 'Plans, credits, and subscription webhooks are already connected end to end.',
  },
  {
    icon: Zap,
    title: 'Type-safe API layer',
    body: 'An oRPC router shares types between server and client, so the API and the UI never drift.',
  },
  {
    icon: Lock,
    title: 'Auth, guards, and invitations',
    body: 'Supabase auth, org-scoped procedure guards, and an invite flow with email delivery — the boring-but-critical plumbing is done.',
  },
  {
    icon: Layers,
    title: 'A modern, boring-in-a-good-way stack',
    body: 'Next.js App Router, Prisma on Postgres, Tailwind, and Supabase — nothing exotic, everything you already know how to deploy.',
    wide: true,
  },
]

export function FeatureGrid() {
  return (
    <PageSection id='features' className='relative isolate scroll-mt-24 py-24 md:py-32'>
      {/* Skew the backdrop band, not the content, so copy stays level and readable. */}
      <div aria-hidden='true' className='bg-card/40 absolute inset-x-0 top-24 bottom-10 -z-10 -skew-y-2 border-y'>
        <CircuitGrid />
      </div>

      <SectionHeading
        index='01'
        label='Systems'
        title='Everything a real SaaS needs, already wired together'
        description='Multi-tenancy, access control, and billing are the parts every team rebuilds from scratch. Here they come standard.'
      />

      <ul className={cn('mx-auto mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3', MARKETING_SURFACE_MAX_WIDTH)}>
        {FEATURES.map((feature, index) => (
          <li
            key={feature.title}
            className={cn(
              feature.featured && 'md:col-span-2 lg:col-span-1 lg:row-span-2',
              feature.wide && 'md:col-span-2 lg:col-span-3'
            )}
          >
            <Card
              className={cn(
                'group h-full gap-4 px-6 transition-colors',
                feature.featured &&
                  'bg-neon/5 border-neon/30 justify-between [--edge:color-mix(in_srgb,var(--neon,var(--primary))_30%,transparent)] lg:py-8'
              )}
            >
              <div className='flex flex-col gap-4'>
                <div className='flex items-start justify-between gap-4'>
                  <IconFrame>
                    <feature.icon />
                  </IconFrame>
                  <span aria-hidden='true' className='font-label text-muted-foreground text-xs tracking-[0.2em]'>
                    {`0x0${index + 1}`}
                  </span>
                </div>
                <h3 className={cn('font-semibold', feature.featured ? 'text-2xl' : 'text-lg')}>{feature.title}</h3>
                <p className='text-muted-foreground text-sm leading-6'>{feature.body}</p>
              </div>
              {feature.tags ? (
                <ul className='flex flex-wrap gap-2'>
                  {feature.tags.map((tag) => (
                    <li key={tag}>
                      <Badge variant='outline'>{tag}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </PageSection>
  )
}

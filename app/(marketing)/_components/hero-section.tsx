// app/(marketing)/_components/hero-section.tsx

import { AnimatedGroup } from '@/app/(marketing)/_components/ui/animated-group'
import AnimatedShinyText from '@/app/(marketing)/_components/ui/animated-shiny-text'
import { HyperText } from '@/app/(marketing)/_components/ui/hyper-text'
import TextEffect from '@/app/(marketing)/_components/ui/text-effect'
import { MARKETING_SURFACE_MAX_WIDTH, PageSection } from '@/components/page-section'
import PricingComponent from '@/components/PricingComponent'
import { Button } from '@/components/ui/button'
import { ShineBorder } from '@/components/ui/shine-border'
import {
    Building2,
    CreditCard,
    Layers,
    Lock,
    Rocket,
    ShieldCheck,
    UserPlus,
    Users,
    Zap,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import prisma from '@/app/lib/db'
import { getCachedUser } from '@/app/lib/supabase/server'
import {
    APP_DESCRIPTION,
    APP_DESCRIPTION_LONG,
    APP_SLOGAN,
    GLASS_CARD,
    PLAN_IDS,
    PRICE_HEADING,
    PRICING_PLANS,
    resolveEffectivePlanId,
    TESTIMONIALS,
    TESTIMONIAL_TICKER_ENABLED,
    type PlanId,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

const HERO_LIGHT_IMAGE_PATH = '/HeroDark-02.png'
const HERO_DARK_IMAGE_PATH = '/HeroDark-03.png'

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { type: 'spring' as const, bounce: 0.3, duration: 1.5 },
    },
  },
}

// Card base styles that play nicely with GLASS_CARD constant from lib/constants.ts

export default async function HeroSection() {
  const {
    data: { user },
  } = await getCachedUser()

  // Get Organization Billing Data
  let orgBilling = null
  if (user) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          include: { subscription: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    orgBilling = membership?.organization
  }

  const subStatus = orgBilling?.subscription?.status ?? null
  const creditsUsed = orgBilling?.credits ?? 0
  // Accounts for one-time (non-recurring) plan purchases like Starter, which
  // never create a Subscription row -- see lib/constants.ts's
  // resolveEffectivePlanId. Deliberately does not infer a plan from having
  // leftover/transferred credits.
  const currentPlanId: PlanId = resolveEffectivePlanId(
    orgBilling?.subscription?.planId,
    (orgBilling as { oneTimePlanId?: string | null } | null | undefined)?.oneTimePlanId
  )

  const proCredits =
    PRICING_PLANS.find((p) => p.id === PLAN_IDS.PLAN_D)?.credits ?? 0
  const proExhausted =
    subStatus === 'active' && currentPlanId === PLAN_IDS.PLAN_D
      ? creditsUsed >= proCredits
      : false

  const glassCardFlexBetween =
    'flex h-full flex-col justify-between rounded-2xl p-6 text-left shadow-sm'
  const alignedSurfaceWidth = MARKETING_SURFACE_MAX_WIDTH

  return (
    <>
      <main className='relative overflow-hidden'>
        {/* --- BACKGROUND LAYER --- */}
        <div
          aria-hidden
          className='absolute inset-0 isolate hidden opacity-65 contain-strict lg:block'
        >
          <div className='absolute left-0 top-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]' />
          <div className='absolute left-0 top-0 h-320 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]' />
          <div className='absolute left-0 top-0 h-320 w-60 -translate-y-87.5 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]' />
        </div>

        <div
          aria-hidden
          className='absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]'
        />

        {/* --- CONTENT LAYER --- */}
        <div className='relative z-10'>
          {/* HERO SECTION - Slogan */}
          <PageSection className='pt-32 pb-6 md:pt-40 md:pb-10'>
            <div className='font-bold mx-auto flex max-w-4xl flex-col items-center text-center'>
              <AnimatedGroup variants={transitionVariants}>
                <Link
                  href='/get-started'
                  className='group relative mx-auto flex w-fit items-center gap-4 overflow-hidden rounded-full border bg-muted px-4 py-1 shadow-md shadow-zinc-950/5 transition-colors duration-300 hover:bg-background dark:border-t-white/5 dark:shadow-zinc-950 dark:hover:border-t-border'
                >
                  <ShineBorder
                    borderWidth={1}
                    duration={20}
                    shineColor={['var(--primary)']}
                  />
                  <AnimatedShinyText className='inline-flex items-center justify-center px-1 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400'>
                    <span className='text-primary text-sm'>{APP_SLOGAN}</span>
                  </AnimatedShinyText>
                </Link>
              </AnimatedGroup>
            </div>
          </PageSection>

          {/* HERO SECTION - Main Heading */}
          <PageSection className='py-6 md:py-10'>
            <div className='mx-auto flex max-w-4xl flex-col items-center text-center'>
              <TextEffect
                preset='fade-in-blur'
                speedSegment={0.3}
                as='h1'
                className='mx-auto max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl xl:text-[5.25rem]'
              >
                {APP_DESCRIPTION}
              </TextEffect>
            </div>
          </PageSection>

          {/* HERO SECTION - Description */}
          <PageSection className='py-6 md:py-10'>
            <div className='mx-auto flex max-w-4xl flex-col items-center text-center'>
              <HyperText className='max-w-2xl text-balance text-lg text-muted-foreground'>
                {APP_DESCRIPTION_LONG}
              </HyperText>
            </div>
          </PageSection>

          {/* HERO SECTION - CTA Button */}
          <PageSection className='py-6 md:py-10'>
            <div className='mx-auto flex max-w-4xl flex-col items-center text-center'>
              <AnimatedGroup
                variants={{
                  container: {
                    visible: {
                      transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                    },
                  },
                  ...transitionVariants,
                }}
                className='flex flex-col items-center justify-center gap-6 md:flex-row'
              >
                {user ? (
                  <Button asChild size='lg' variant='default' className='font-bold px-5'>
                    <Link href='/dashboard'>
                      <span className='text-nowrap'>Dashboard</span>
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size='lg' variant='default' className='font-bold px-5'>
                    <Link href='/get-started'>
                      <span className='text-nowrap'>Get Started</span>
                    </Link>
                  </Button>
                )}
              </AnimatedGroup>
            </div>
          </PageSection>

          {/* HERO SECTION - App Screenshot */}
          <PageSection className='py-6 md:py-10'>
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className='mask-b-from-55% relative overflow-hidden px-2 pt-5 md:pt-7'>
                <div className='absolute inset-x-8 top-10 -z-10 h-56 rounded-full bg-primary/10 blur-3xl' />
                <div className='absolute left-12 top-28 -z-10 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl' />
                <div className='absolute bottom-12 right-14 -z-10 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl' />

                <div className='mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-center gap-3 text-xs font-medium text-muted-foreground'>
                  <div className='font-bold rounded-full border border-border/60 bg-background/70 px-3 py-2 backdrop-blur'>
                    Multi-tenant orgs
                  </div>
                  <div className='font-bold rounded-full border border-border/60 bg-background/70 px-3 py-2 backdrop-blur'>
                    Role-based access
                  </div>
                  <div className='font-bold rounded-full border border-border/60 bg-background/70 px-3 py-2 backdrop-blur'>
                    Stripe billing
                  </div>
                  <div className='font-bold rounded-full border border-border/60 bg-background/70 px-3 py-2 backdrop-blur'>
                    Type-safe API
                  </div>
                </div>

                <div className={cn('relative mx-auto flex flex-col gap-4 lg:gap-6', alignedSurfaceWidth)}>
                  <div className='hidden gap-4 md:grid md:grid-cols-2 xl:gap-6'>
                    <div className='pointer-events-none rounded-2xl border border-border/60 bg-background/78 p-4 shadow-lg shadow-black/10 backdrop-blur'>
                      <div className='flex items-center gap-3'>
                        <Building2 className='h-5 w-5 text-primary' />
                        <div>
                          <div className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                            New workspace
                          </div>
                          <div className='mt-1 text-sm font-semibold text-foreground'>
                            "Client Onboarding" created
                          </div>
                        </div>
                      </div>
                      <p className='mt-3 text-xs leading-5 text-muted-foreground'>
                        Every organization gets its own workspaces, scoped to plan limits automatically.
                      </p>
                    </div>

                    <div className='pointer-events-none rounded-2xl border border-border/60 bg-background/78 p-4 shadow-lg shadow-black/10 backdrop-blur'>
                      <div className='flex items-center gap-3'>
                        <UserPlus className='h-5 w-5 text-primary' />
                        <div>
                          <div className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                            Invite sent
                          </div>
                          <div className='mt-1 text-sm font-semibold text-foreground'>
                            Admin access · 2 workspaces
                          </div>
                        </div>
                      </div>
                      <p className='mt-3 text-xs leading-5 text-muted-foreground'>
                        Grant teammates exactly the workspaces they need, nothing more.
                      </p>
                    </div>
                  </div>

                  <div className='hidden justify-center lg:flex'>
                    <div className='pointer-events-none w-full max-w-sm rounded-2xl border border-border/60 bg-background/82 p-4 shadow-lg shadow-black/10 backdrop-blur'>
                      <div className='flex items-center justify-between gap-4'>
                        <div>
                          <div className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
                            Billing
                          </div>
                          <div className='mt-1 text-sm font-semibold text-foreground'>
                            Upgraded to Team plan
                          </div>
                        </div>
                        <CreditCard className='h-5 w-5 shrink-0 text-primary' />
                      </div>
                    </div>
                  </div>

                  <div className='inset-shadow-2xs ring-background dark:inset-shadow-white/20 relative overflow-hidden rounded-[2rem] border bg-background/85 p-4 shadow-lg shadow-zinc-950/15 ring-1'>
                    <ShineBorder
                      borderWidth={1}
                      duration={20}
                      shineColor={['var(--primary)']}
                    />
                    <Image
                      className='bg-background relative hidden aspect-15/8 rounded-2xl object-contain object-top dark:block'
                      src={HERO_DARK_IMAGE_PATH}
                      alt='app screen'
                      width='2700'
                      height='1440'
                      priority
                    />
                    <Image
                      className='border-border/25 relative z-2 aspect-15/8 rounded-2xl border object-contain object-top dark:hidden'
                      src={HERO_LIGHT_IMAGE_PATH}
                      alt='app screen'
                      width='2700'
                      height='1440'
                    />
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </PageSection>

          {/* SECTION 1: Features — Bento Grid */}
          <PageSection id='features' className='bg-background py-6 md:py-10 relative overflow-hidden'>
            <div
              aria-hidden
              className='absolute inset-0 pointer-events-none opacity-40'
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(255,255,255,0.06), transparent 70%)'
              }}
            />

            <div className='mx-auto max-w-3xl text-center relative z-10'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                Everything a real SaaS needs, already wired together
              </h2>
              <p className='mt-4 text-muted-foreground'>
                Multi-tenancy, access control, and billing are the parts every team rebuilds from scratch. Here they come standard.
              </p>
            </div>

            <div
              className={cn(
                'relative z-10 mx-auto mt-10 grid w-full auto-rows-[minmax(160px,auto)] grid-cols-1 gap-5 sm:grid-cols-2 md:mt-12 lg:grid-cols-4',
                alignedSurfaceWidth
              )}
            >
              {/* Hero tile — Organizations & Workspaces */}
              <div
                className={cn(
                  'relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 shadow-sm sm:col-span-2 lg:col-span-2 lg:row-span-2',
                  GLASS_CARD,
                  'bg-primary/[0.06]'
                )}
              >
                <div
                  aria-hidden
                  className='absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl'
                />
                <div className='relative'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10'>
                    <Building2 className='h-5 w-5 text-primary' />
                  </div>
                  <h3 className='mt-4 text-lg font-semibold tracking-tight'>
                    Multi-tenant by default
                  </h3>
                  <p className='mt-2 max-w-sm text-sm leading-6 text-muted-foreground'>
                    Every user belongs to one or more organizations, and every organization can spin up
                    workspaces scoped to its pricing plan. It's the multi-tenant foundation most teams spend
                    weeks building — here from the first commit.
                  </p>
                </div>
                <div className='relative mt-6 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground'>
                  <span className='rounded-full border border-border/60 bg-background/70 px-3 py-1'>Organizations</span>
                  <span className='rounded-full border border-border/60 bg-background/70 px-3 py-1'>Workspaces</span>
                  <span className='rounded-full border border-border/60 bg-background/70 px-3 py-1'>Plan-based limits</span>
                </div>
              </div>

              {/* Role-based access control */}
              <div className={cn('flex flex-col justify-between rounded-2xl p-6 shadow-sm sm:col-span-2 lg:col-span-2', GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10'>
                    <ShieldCheck className='h-5 w-5 text-primary' />
                  </div>
                  <h3 className='text-lg font-semibold tracking-tight'>
                    Role-based access control
                  </h3>
                </div>
                <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                  Owner, Admin, and Member roles out of the box — plus per-workspace access grants, so an
                  admin can hand a teammate exactly the workspaces they need and nothing else.
                </p>
              </div>

              {/* Stripe billing */}
              <div className={cn('flex flex-col justify-between rounded-2xl p-6 shadow-sm', GLASS_CARD)}>
                <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10'>
                  <CreditCard className='h-5 w-5 text-primary' />
                </div>
                <div className='mt-4'>
                  <h3 className='text-sm font-semibold tracking-tight'>Stripe billing built in</h3>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                    Plans, credits, and subscription webhooks are already connected end to end.
                  </p>
                </div>
              </div>

              {/* Type-safe API */}
              <div className={cn('flex flex-col justify-between rounded-2xl p-6 shadow-sm', GLASS_CARD)}>
                <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10'>
                  <Zap className='h-5 w-5 text-primary' />
                </div>
                <div className='mt-4'>
                  <h3 className='text-sm font-semibold tracking-tight'>Type-safe API layer</h3>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                    An oRPC router shares types between server and client, so the API and the UI never drift.
                  </p>
                </div>
              </div>

              {/* Auth & Guards */}
              <div className={cn('flex flex-col justify-between rounded-2xl p-6 shadow-sm sm:col-span-2 lg:col-span-2', GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10'>
                    <Lock className='h-5 w-5 text-primary' />
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Auth, guards, and invitations
                  </h3>
                </div>
                <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                  Supabase auth, org-scoped procedure guards, and an invite flow with email delivery — the
                  boring-but-critical plumbing is done.
                </p>
              </div>

              {/* Stack */}
              <div className={cn('flex flex-col justify-between rounded-2xl p-6 shadow-sm sm:col-span-2 lg:col-span-2', GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10'>
                    <Layers className='h-5 w-5 text-primary' />
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    A modern, boring-in-a-good-way stack
                  </h3>
                </div>
                <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                  Next.js App Router, Prisma on Postgres, Tailwind, and Supabase — nothing exotic, everything
                  you already know how to deploy.
                </p>
              </div>
            </div>
          </PageSection>

          {/* SECTION 2: How it works */}
          <PageSection id='how-it-works' className='bg-background py-6 md:py-10 relative overflow-hidden'>
            <div
              aria-hidden
              className='absolute inset-0 pointer-events-none opacity-40'
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(255,255,255,0.06), transparent 70%)'
              }}
            />

            <div className='mx-auto max-w-3xl text-center relative z-10'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                How it works
              </h2>
              <p className='mt-4 text-muted-foreground'>
                From signup to your first paying customer, in three steps.
              </p>
            </div>

            <div className={cn('relative z-10 mx-auto mt-10 grid w-full gap-8 md:mt-12 md:grid-cols-3', alignedSurfaceWidth)}>
              <div className={cn('flex flex-col rounded-2xl p-5 text-left shadow-sm', GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                    1
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Spin up an organization
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Sign up and an organization is created automatically.</li>
                  <li>Add your first workspace within the free plan's limit.</li>
                  <li>Everything is scoped to your organization from the start.</li>
                </ul>
              </div>

              <div className={cn('flex flex-col rounded-2xl p-5 text-left shadow-sm', GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                    2
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Invite your team, assign workspaces
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Invite admins and members by email.</li>
                  <li>Choose exactly which workspaces each person can access.</li>
                  <li>Change roles and access at any time.</li>
                </ul>
              </div>

              <div className={cn('flex flex-col rounded-2xl p-5 text-left shadow-sm', GLASS_CARD)}>
                <div className='flex items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                    3
                  </div>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Turn on billing and ship
                  </h3>
                </div>
                <ul className='mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground'>
                  <li>Pick a plan and let Stripe handle checkout and renewals.</li>
                  <li>Workspace limits and credits update automatically per plan.</li>
                  <li>Focus on your product instead of billing plumbing.</li>
                </ul>
              </div>
            </div>

            <div className='mt-12 font-bold flex justify-center md:mt-16'>
              <Button asChild size='lg'>
                <Link href={user ? '/dashboard' : '/get-started'}>
                  <span>{user ? 'Dashboard' : 'Get Started'}</span>
                </Link>
              </Button>
            </div>
          </PageSection>

          {/* SECTION 3: Testimonials */}
          <PageSection className='bg-background py-6 md:py-10 relative overflow-hidden'>
            <div className='mx-auto max-w-3xl text-center'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
                What builders say
              </h2>
              <p className='mt-4 text-muted-foreground'>
                Teams use this kit to skip the multi-tenant, billing, and access-control groundwork and get
                straight to building their actual product.
              </p>
            </div>

            {TESTIMONIAL_TICKER_ENABLED ? (
              <div className={cn('mx-auto mt-10 w-full md:mt-12', alignedSurfaceWidth)}>
                <div className='testimonial-ticker relative overflow-hidden'>
                  {/* MOBILE: swipe carousel */}
                  <div className='md:hidden'>
                    <div
                      className='flex gap-4 overflow-x-auto px-4 py-6
                                 snap-x snap-mandatory
                                 [-webkit-overflow-scrolling:touch]
                                 [scrollbar-width:none]
                                 [&::-webkit-scrollbar]:hidden
                                 md:cursor-grab active:cursor-grabbing'
                    >
                      {TESTIMONIALS.map((t, idx) => (
                        <div
                          key={`m-${idx}`}
                          className={cn(
                            'w-[280px] flex-none snap-start rounded-2xl p-6 shadow-sm',
                            GLASS_CARD
                          )}
                        >
                          <p className='text-sm text-muted-foreground'>{t.quote}</p>
                          <div className='mt-4'>
                            <div className='text-sm font-semibold'>{t.name}</div>
                            <div className='text-xs text-muted-foreground'>{t.title}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className='pb-4 text-center text-xs text-muted-foreground'>
                      Swipe to read more →
                    </p>
                  </div>

                  {/* DESKTOP: auto marquee */}
                  <div className='hidden md:block'>
                    <div className='ticker-track flex gap-6 py-6 will-change-transform'>
                      <div className='flex gap-6 animate-marquee'>
                        {TESTIMONIALS.map((t, idx) => (
                          <div
                            key={`d1-${idx}`}
                            className={cn(
                              'w-[360px] flex-none rounded-2xl p-6 shadow-sm',
                              GLASS_CARD
                            )}
                          >
                            <p className='text-sm text-muted-foreground'>{t.quote}</p>
                            <div className='mt-4'>
                              <div className='text-sm font-semibold'>{t.name}</div>
                              <div className='text-xs text-muted-foreground'>{t.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Duplicate for seamless loop */}
                      <div className='flex gap-6 animate-marquee' aria-hidden='true'>
                        {TESTIMONIALS.map((t, idx) => (
                          <div
                            key={`d2-${idx}`}
                            className={cn(
                              'w-[360px] flex-none rounded-2xl p-6 shadow-sm',
                              GLASS_CARD
                            )}
                          >
                            <p className='text-sm text-muted-foreground'>{t.quote}</p>
                            <div className='mt-4'>
                              <div className='text-sm font-semibold'>{t.name}</div>
                              <div className='text-xs text-muted-foreground'>{t.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <p className='mt-3 hidden text-center text-xs text-muted-foreground md:block'>
                  Tip: Hover to pause.
                </p>
              </div>
            ) : (
              <div className='mx-auto mt-10 grid w-full max-w-5xl gap-8 md:mt-12 md:grid-cols-3'>
                {TESTIMONIALS.slice(0, 6).map((t, idx) => (
                  <div key={idx} className={cn(glassCardFlexBetween, GLASS_CARD)}>
                    <p className='text-sm text-muted-foreground'>{t.quote}</p>
                    <div className='mt-4'>
                      <div className='text-sm font-semibold'>{t.name}</div>
                      <div className='text-xs text-muted-foreground'>{t.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageSection>

          {/* SECTION 4: PRICING */}
          <PageSection id='pricing' className='bg-background py-6 md:py-10 relative overflow-hidden'>
            {/* Very subtle gradient backdrop */}
            <div
              aria-hidden
              className='absolute inset-0 pointer-events-none opacity-40'
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(255,255,255,0.02), transparent 70%)'
              }}
            />

            <div className='flex flex-col items-center gap-4 text-center relative z-10'>
              <h2 className='text-3xl font-bold md:text-4xl'>{PRICE_HEADING}</h2>
            </div>
            <div className='mt-10 md:mt-12 relative z-10'>
              <PricingComponent
                currentPlanId={currentPlanId}
                isAuthenticated={!!user}
                mode='marketing'
                proExhausted={proExhausted}
              />
            </div>
          </PageSection>
        </div>
      </main>
    </>
  )
}

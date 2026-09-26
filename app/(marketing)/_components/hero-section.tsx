// app/(marketing)/_components/hero-section.tsx

import { FeatureGrid } from '@/app/(marketing)/_components/landing/feature-grid'
import { HowItWorks } from '@/app/(marketing)/_components/landing/how-it-works'
import { LandingHero } from '@/app/(marketing)/_components/landing/landing-hero'
import { PricingSection } from '@/app/(marketing)/_components/landing/pricing-section'
import { ProductPreview } from '@/app/(marketing)/_components/landing/product-preview'
import { Testimonials } from '@/app/(marketing)/_components/landing/testimonials'
import prisma from '@/app/lib/db'
import { getCachedUser } from '@/app/lib/supabase/server'
import { PLAN_IDS, PRICING_PLANS, resolveEffectivePlanId, type PlanId } from '@/lib/constants'

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

  const isAuthenticated = !!user

  return (
    <>
      <LandingHero isAuthenticated={isAuthenticated} />
      <ProductPreview />
      <FeatureGrid />
      <HowItWorks isAuthenticated={isAuthenticated} />
      <Testimonials />
      <PricingSection currentPlanId={currentPlanId} isAuthenticated={isAuthenticated} proExhausted={proExhausted} />
    </>
  )
}

// app/(marketing)/_components/landing/pricing-section.tsx

import { SectionHeading } from '@/app/(marketing)/_components/landing/section-heading'
import { CircuitGrid } from '@/components/cyber/circuit-grid'
import { PageSection } from '@/components/page-section'
import PricingComponent from '@/components/PricingComponent'
import { PRICE_HEADING, type PlanId } from '@/lib/constants'

interface PricingSectionProps {
  currentPlanId: PlanId
  isAuthenticated: boolean
  proExhausted: boolean
}

export function PricingSection({ currentPlanId, isAuthenticated, proExhausted }: PricingSectionProps) {
  return (
    <PageSection id='pricing' className='relative isolate scroll-mt-24 overflow-hidden py-24 md:py-32'>
      <CircuitGrid mesh />
      <SectionHeading index='04' label='Access tiers' title={PRICE_HEADING} />
      {/* Vertical padding leaves room for the scaled-up featured plan. */}
      <div className='mt-12 md:py-6'>
        <PricingComponent
          currentPlanId={currentPlanId}
          isAuthenticated={isAuthenticated}
          mode='marketing'
          proExhausted={proExhausted}
        />
      </div>
    </PageSection>
  )
}

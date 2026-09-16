// tests/unit/resolve-effective-plan-id.test.ts
// Unit tests for resolveEffectivePlanId (no DB required).
//
// Background: Starter (PLAN_A) is sold as a one-time Stripe Checkout payment
// (billingRouter.createSubscription's `isOneTime` branch), not a recurring
// subscription, so it never creates a Subscription row. resolveEffectivePlanId
// is the single shared resolver (used by WorkspaceService, InvitationService,
// the dashboard layout badge, the marketing hero CTA, and the super-admin
// panel) that accounts for that, instead of each call site re-deriving the
// plan from `subscription.planId` alone and permanently misclassifying a
// legitimate one-time-plan purchaser as Free.

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { PLAN_IDS, PRICING_PLANS, resolveEffectivePlanId } from '@/lib/constants'

const PAID_PLAN_IDS = PRICING_PLANS.filter((p) => p.id !== PLAN_IDS.free).map((p) => p.id)
const paidPlanArbitrary = fc.constantFrom(...PAID_PLAN_IDS)

describe('resolveEffectivePlanId', () => {
  it('resolves to free when there is neither a subscription nor a one-time purchase', () => {
    expect(resolveEffectivePlanId(null, null)).toBe(PLAN_IDS.free)
    expect(resolveEffectivePlanId(undefined, undefined)).toBe(PLAN_IDS.free)
  })

  it('resolves Starter from oneTimePlanId alone, with no subscription record at all', () => {
    // This is the exact shape of a real Starter (one-time payment) purchaser:
    // credits were added and oneTimePlanId was recorded, but there is no
    // Subscription row to resolve a plan from.
    expect(resolveEffectivePlanId(null, PLAN_IDS.PLAN_A)).toBe(PLAN_IDS.PLAN_A)
  })

  it('prefers an active recurring subscription plan over a one-time purchase', () => {
    // e.g. an org that bought Starter once and later upgraded to a recurring plan.
    expect(resolveEffectivePlanId(PLAN_IDS.PLAN_B, PLAN_IDS.PLAN_A)).toBe(PLAN_IDS.PLAN_B)
  })

  it('resolves by Stripe price id just like the underlying resolvePlanId', () => {
    const planA = PRICING_PLANS.find((p) => p.id === PLAN_IDS.PLAN_B)
    if (planA?.stripePriceId) {
      expect(resolveEffectivePlanId(planA.stripePriceId, null)).toBe(PLAN_IDS.PLAN_B)
    }
  })

  it('never infers a paid plan from an unrecognized subscription planId, even with a one-time purchase set', () => {
    expect(resolveEffectivePlanId('not-a-real-price-id', null)).toBe(PLAN_IDS.free)
  })

  it('falls back to the one-time purchase whenever the subscription does not resolve to a paid plan', () => {
    fc.assert(
      fc.property(paidPlanArbitrary, (oneTimePlanId) => {
        expect(resolveEffectivePlanId(null, oneTimePlanId)).toBe(oneTimePlanId)
        expect(resolveEffectivePlanId(PLAN_IDS.free, oneTimePlanId)).toBe(oneTimePlanId)
        expect(resolveEffectivePlanId('garbage-price-id', oneTimePlanId)).toBe(oneTimePlanId)
      })
    )
  })

  it('a subscription plan, when it resolves to a real paid plan, always wins regardless of the one-time purchase', () => {
    fc.assert(
      fc.property(paidPlanArbitrary, paidPlanArbitrary, (subscriptionPlanId, oneTimePlanId) => {
        expect(resolveEffectivePlanId(subscriptionPlanId, oneTimePlanId)).toBe(subscriptionPlanId)
      })
    )
  })
})

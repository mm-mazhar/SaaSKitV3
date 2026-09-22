// tests/analytics/plan-change.test.ts
// Unit tests for the upgrade/downgrade classifier the Stripe webhook uses to
// turn a bare `customer.subscription.updated` into a directional event.
//
// Uses PLAN_IDS values as stand-in Stripe price ids: resolvePlanId matches on
// either `stripePriceId` or `id`, and the real STRIPE_PRICE_ID_* values come
// from the environment, so keying off plan ids keeps these cases deterministic
// on any machine and in CI.

import { PLAN_IDS, PRICING_PLANS } from '@/lib/constants'
import { describe, expect, it } from 'vitest'
import { classifyPlanChange, planTitleFor } from '@/lib/analytics/plan-change'

describe('classifyPlanChange', () => {
  it('reports a move to a higher tier as an upgrade', () => {
    // #given an organization on Starter #when it moves to Agency
    const change = classifyPlanChange(PLAN_IDS.PLAN_A, PLAN_IDS.PLAN_C)

    // #then the change is directional, not just "different"
    expect(change).toEqual({ kind: 'upgraded', from: PLAN_IDS.PLAN_A, to: PLAN_IDS.PLAN_C })
  })

  it('reports a move to a lower tier as a downgrade', () => {
    const change = classifyPlanChange(PLAN_IDS.PLAN_C, PLAN_IDS.PLAN_A)

    expect(change).toEqual({ kind: 'downgraded', from: PLAN_IDS.PLAN_C, to: PLAN_IDS.PLAN_A })
  })

  it('reports the same plan as unchanged so non-plan updates stay silent', () => {
    // Stripe emits customer.subscription.updated for cancellation scheduling,
    // payment-method changes and period rollovers too. Those must not produce
    // an upgrade or downgrade event.
    const change = classifyPlanChange(PLAN_IDS.PLAN_B, PLAN_IDS.PLAN_B)

    expect(change.kind).toBe('unchanged')
  })

  it('treats leaving the free plan as an upgrade', () => {
    expect(classifyPlanChange(null, PLAN_IDS.PLAN_A).kind).toBe('upgraded')
  })

  it('treats an unrecognised price id as free rather than throwing', () => {
    // A webhook must never crash on a price id that is not in PRICING_PLANS
    // (a legacy price, a plan removed from the kit). resolvePlanId degrades to
    // free, so a move away from it reads as an upgrade.
    expect(() => classifyPlanChange('price_does_not_exist', PLAN_IDS.PLAN_B)).not.toThrow()
    expect(classifyPlanChange('price_does_not_exist', PLAN_IDS.PLAN_B).kind).toBe('upgraded')
  })

  it('ranks every plan by its position in PRICING_PLANS', () => {
    // Guards the assumption the classifier is built on: PRICING_PLANS is
    // authored in ascending tier order. Reordering it without noticing would
    // otherwise silently invert upgrade and downgrade.
    for (let i = 1; i < PRICING_PLANS.length; i++) {
      const change = classifyPlanChange(PRICING_PLANS[i - 1].id, PRICING_PLANS[i].id)
      expect(change.kind).toBe('upgraded')
    }
  })
})

describe('planTitleFor', () => {
  it('returns the human-readable title used as the group plan property', () => {
    expect(planTitleFor(PLAN_IDS.PLAN_B)).toBe('Team')
    expect(planTitleFor(PLAN_IDS.free)).toBe('Free')
  })
})

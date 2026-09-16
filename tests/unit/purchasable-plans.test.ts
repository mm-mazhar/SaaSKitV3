// tests/unit/purchasable-plans.test.ts
// Unit tests for getPurchasablePlans / PURCHASABLE_PLANS (no DB required).
//
// Background: PARTNER_PLAN_ENABLED is a per-project kill switch for the
// Partner tier (see lib/constants.ts) -- flipping it to false should hide
// Partner from anywhere a customer could newly subscribe (marketing pricing
// table, dashboard upgrade cards, createSubscription API) while leaving it
// resolvable in PRICING_PLANS for anyone already subscribed to it, so
// existing subscribers' webhooks/entitlements never break. getPurchasablePlans
// is exported as a pure function specifically so both states of the flag can
// be exercised here without reloading the constants module.

import { describe, it, expect } from 'vitest'
import {
  getPurchasablePlans,
  PARTNER_PLAN_ENABLED,
  PLAN_IDS,
  PRICING_PLANS,
  PURCHASABLE_PLANS,
} from '@/lib/constants'

describe('getPurchasablePlans', () => {
  it('includes every plan, including Partner, when the flag is on', () => {
    const plans = getPurchasablePlans(PRICING_PLANS, true)
    expect(plans).toHaveLength(PRICING_PLANS.length)
    expect(plans.some((p) => p.id === PLAN_IDS.PLAN_D)).toBe(true)
  })

  it('excludes only Partner when the flag is off', () => {
    const plans = getPurchasablePlans(PRICING_PLANS, false)
    expect(plans).toHaveLength(PRICING_PLANS.length - 1)
    expect(plans.some((p) => p.id === PLAN_IDS.PLAN_D)).toBe(false)
    // every other plan (Free, Starter, Team, Agency) is untouched
    for (const plan of PRICING_PLANS) {
      if (plan.id === PLAN_IDS.PLAN_D) continue
      expect(plans.some((p) => p.id === plan.id)).toBe(true)
    }
  })

  it('never mutates the input array', () => {
    const before = [...PRICING_PLANS]
    getPurchasablePlans(PRICING_PLANS, false)
    expect(PRICING_PLANS).toEqual(before)
  })

  it('PRICING_PLANS itself always keeps Partner, regardless of the flag', () => {
    // Resolution logic (resolvePlanId, the Stripe webhook's credit lookup,
    // admin reporting) reads PRICING_PLANS directly and must keep resolving
    // Partner for orgs that are already subscribed to it even after the
    // flag is turned off for new purchases.
    expect(PRICING_PLANS.some((p) => p.id === PLAN_IDS.PLAN_D)).toBe(true)
  })

  it('PURCHASABLE_PLANS reflects the current value of PARTNER_PLAN_ENABLED', () => {
    const hasPartner = PURCHASABLE_PLANS.some((p) => p.id === PLAN_IDS.PLAN_D)
    expect(hasPartner).toBe(PARTNER_PLAN_ENABLED)
  })
})

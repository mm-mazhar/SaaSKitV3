// lib/analytics/plan-change.ts

import { PRICING_PLANS, resolvePlanId, type PlanId } from '@/lib/constants'

/**
 * Human-readable plan label for analytics ("Team", not
 * "Team_2cbe76770e9993ab"). Kept in one place so the group property PostHog
 * segments on means the same thing from the browser, the oRPC layer and the
 * Stripe webhook.
 */
export function planTitleFor(planId: PlanId): string | null {
  return PRICING_PLANS.find((plan) => plan.id === planId)?.title ?? null
}

export type PlanChange =
  | { kind: 'upgraded'; from: PlanId; to: PlanId }
  | { kind: 'downgraded'; from: PlanId; to: PlanId }
  | { kind: 'unchanged'; from: PlanId; to: PlanId }

/**
 * PRICING_PLANS is authored in ascending tier order (Free -> Starter -> Team
 * -> Agency -> Partner), so a plan's index in that array is its rank. Reading
 * rank from the existing array rather than a second hand-maintained ordering
 * means adding or reordering a tier can't silently desync the two.
 */
function rankOf(planId: PlanId): number {
  return PRICING_PLANS.findIndex((plan) => plan.id === planId)
}

/**
 * Classifies a Stripe subscription price change as an upgrade or downgrade.
 *
 * Takes Stripe price ids (what `Subscription.planId` actually stores) and
 * resolves them through the same `resolvePlanId` the rest of the kit uses,
 * so an unrecognised price id degrades to Free instead of throwing inside a
 * webhook.
 */
export function classifyPlanChange(
  previousStripePriceId: string | null | undefined,
  nextStripePriceId: string | null | undefined
): PlanChange {
  const from = resolvePlanId(previousStripePriceId)
  const to = resolvePlanId(nextStripePriceId)

  if (from === to) return { kind: 'unchanged', from, to }

  return rankOf(to) > rankOf(from)
    ? { kind: 'upgraded', from, to }
    : { kind: 'downgraded', from, to }
}

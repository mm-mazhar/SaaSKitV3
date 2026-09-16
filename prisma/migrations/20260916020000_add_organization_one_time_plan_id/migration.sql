-- Tracks a one-time (non-recurring) plan purchase, e.g. Starter, which is
-- sold via a one-time Stripe Checkout payment and therefore never creates a
-- Subscription row. Set by the Stripe webhook when a one-time payment for a
-- paid plan succeeds. Independent of `subscription` -- see lib/constants.ts's
-- resolveEffectivePlanId for how the two are reconciled.
ALTER TABLE "Organization" ADD COLUMN "oneTimePlanId" TEXT;

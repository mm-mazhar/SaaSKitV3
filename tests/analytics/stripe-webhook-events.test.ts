// tests/analytics/stripe-webhook-events.test.ts
// Drives the real Stripe webhook route handler with constructed Stripe events
// and asserts what reaches the PostHog SDK, plus the flush guarantees that
// keep events from being lost when a Vercel function is frozen.
//
// Stripe, Prisma, Resend and posthog-node are all mocked at the module level:
// nothing here touches a network or a database.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const PRICE = {
  STARTER: 'price_starter_test',
  TEAM: 'price_team_test',
  AGENCY: 'price_agency_test',
}

/** The subset of Prisma's findUnique arguments these cases dispatch on. */
type FindUniqueArgs = {
  where?: Record<string, unknown>
  select?: Record<string, boolean>
  include?: Record<string, unknown>
}

const posthog = vi.hoisted(() => ({
  capture: vi.fn(),
  groupIdentify: vi.fn(),
  flush: vi.fn(async () => {}),
  shutdown: vi.fn(async () => {}),
}))

vi.hoisted(() => {
  // lib/constants builds PRICING_PLANS from these at module scope, so they
  // must be set before any import runs. Pinning them here keeps plan lookup,
  // credit amounts and upgrade/downgrade direction identical on every machine
  // regardless of what is in the developer's .env.
  process.env.POSTHOG_KEY = 'phc_test_key'
  process.env.STRIPE_PRICE_ID_PLAN_A = 'price_starter_test'
  process.env.STRIPE_PRICE_ID_PLAN_B = 'price_team_test'
  process.env.STRIPE_PRICE_ID_PLAN_C = 'price_agency_test'
  process.env.STRIPE_PRICE_ID_PLAN_D = 'price_partner_test'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
})

vi.mock('posthog-node', () => ({
  PostHog: class {
    constructor() {
      return posthog
    }
  },
}))

vi.mock('next/server', () => ({
  // Runs the deferred work inline, which is what "after the response" means
  // for a test. The webhook itself awaits flushAnalytics directly; this is
  // here only because the shared analytics module imports it.
  after: vi.fn((callback: () => unknown) => {
    void callback()
  }),
}))

const stripeMock = vi.hoisted(() => ({
  webhooks: { constructEvent: vi.fn() },
  subscriptions: {
    list: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
  checkout: { sessions: { list: vi.fn(), listLineItems: vi.fn() } },
  paymentIntents: { retrieve: vi.fn() },
}))

vi.mock('@/app/lib/stripe', () => ({ stripe: stripeMock, getStripeSession: vi.fn() }))

vi.mock('@/app/lib/email', () => ({
  sendPaymentConfirmationEmail: vi.fn(async () => {}),
  sendCancellationEmail: vi.fn(async () => {}),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'stripe-signature': 'sig_test' })),
}))

const prismaMock = vi.hoisted(() => ({
  organization: { findUnique: vi.fn(), update: vi.fn() },
  subscription: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
}))

vi.mock('@/app/lib/db', () => ({ default: prismaMock }))

import { POST } from '@/app/api/webhook/stripe/route'
import { resetPostHogServerClientForTests } from '@/lib/analytics/posthog-server'

const ORG = { id: 'org-1', name: 'Acme', credits: 10 }

function webhookRequest(): Request {
  return new Request('https://example.com/api/webhook/stripe', {
    method: 'POST',
    body: '{}',
  })
}

/** Minimal Stripe subscription shaped the way the handler reads it. */
function stripeSubscription(priceId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_1',
    status: 'active',
    customer: 'cus_1',
    metadata: { organizationId: ORG.id },
    current_period_start: 1_700_000_000,
    current_period_end: 1_702_592_000,
    items: { data: [{ price: { id: priceId, recurring: { interval: 'month' } } }] },
    ...overrides,
  }
}

function givenEvent(event: Record<string, unknown>) {
  stripeMock.webhooks.constructEvent.mockReturnValue(event)
}

/** The single capture call the case under test produced. */
function capturedEvent() {
  expect(posthog.capture).toHaveBeenCalledTimes(1)
  return posthog.capture.mock.calls[0][0] as {
    event: string
    distinctId: string
    properties?: Record<string, unknown>
    groups?: Record<string, string>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  resetPostHogServerClientForTests()

  prismaMock.organization.findUnique.mockImplementation(async (args: FindUniqueArgs) => {
    if (args?.include?.members) {
      return { ...ORG, members: [{ user: { email: 'owner@example.com', name: 'Owner' } }] }
    }
    if (args?.select?.stripeCustomerId && Object.keys(args.select).length === 1) {
      return { stripeCustomerId: 'cus_1' }
    }
    return { ...ORG, stripeCustomerId: 'cus_1', deletedAt: null }
  })
  prismaMock.organization.update.mockResolvedValue({ ...ORG })
  prismaMock.subscription.findUnique.mockResolvedValue(null)
  prismaMock.subscription.update.mockResolvedValue({})
  prismaMock.subscription.upsert.mockResolvedValue({})

  stripeMock.subscriptions.list.mockResolvedValue({ data: [] })
  stripeMock.subscriptions.retrieve.mockResolvedValue(stripeSubscription(PRICE.TEAM))
  stripeMock.subscriptions.update.mockResolvedValue({})
  stripeMock.checkout.sessions.list.mockResolvedValue({ data: [] })
  stripeMock.checkout.sessions.listLineItems.mockResolvedValue({ data: [] })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('checkout_completed', () => {
  it('captures once, attributed to the purchasing user and the organization', async () => {
    // #given a completed subscription checkout started from the dashboard
    givenEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          customer: 'cus_1',
          subscription: 'sub_1',
          mode: 'subscription',
          payment_status: 'paid',
          amount_total: 9999,
          currency: 'usd',
          metadata: { organizationId: ORG.id, userId: 'user-1' },
          client_reference_id: ORG.id,
        },
      },
    })

    // #when Stripe delivers the webhook
    const response = await POST(webhookRequest())

    // #then exactly one event is sent, tied to both the buyer and the tenant
    expect(response.status).toBe(200)
    expect(capturedEvent()).toEqual({
      event: 'checkout_completed',
      distinctId: 'user-1',
      properties: {
        mode: 'subscription',
        amount_total: 9999,
        currency: 'usd',
        is_subscription: true,
      },
      groups: { organization: ORG.id },
    })
  })

  it('falls back to an account-level actor when the session carries no user id', async () => {
    givenEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          customer: 'cus_1',
          subscription: 'sub_1',
          mode: 'subscription',
          payment_status: 'paid',
          amount_total: 9999,
          currency: 'usd',
          metadata: {},
          client_reference_id: ORG.id,
        },
      },
    })

    await POST(webhookRequest())

    expect(capturedEvent().distinctId).toBe('organization:org-1')
  })
})

describe('subscription_created', () => {
  it('captures on the first invoice and refreshes the organization group', async () => {
    // #given the first invoice of a brand new subscription
    stripeMock.subscriptions.list.mockResolvedValue({ data: [stripeSubscription(PRICE.TEAM)] })
    prismaMock.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: 'sub_1',
      planId: PRICE.TEAM,
    })
    givenEvent({
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_1',
          customer: 'cus_1',
          billing_reason: 'subscription_create',
          amount_paid: 9999,
          currency: 'usd',
          customer_email: 'owner@example.com',
          hosted_invoice_url: 'https://invoice',
          number: 'INV-1',
        },
      },
    })

    // #when the webhook runs
    await POST(webhookRequest())

    // #then the event names the plan and the group record is kept current
    const captured = capturedEvent()
    expect(captured.event).toBe('subscription_created')
    expect(captured.groups).toEqual({ organization: ORG.id })
    expect(captured.properties).toMatchObject({
      plan: 'Team',
      stripe_price_id: PRICE.TEAM,
      interval: 'month',
      amount_paid: 9999,
    })
    expect(posthog.groupIdentify).toHaveBeenCalledWith({
      groupType: 'organization',
      groupKey: ORG.id,
      properties: { name: 'Acme', plan: 'Team' },
    })
  })

  it('stays silent on a renewal invoice', async () => {
    // billing_reason is what separates a new subscription from a renewal.
    stripeMock.subscriptions.list.mockResolvedValue({ data: [stripeSubscription(PRICE.TEAM)] })
    prismaMock.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: 'sub_1',
      planId: PRICE.TEAM,
    })
    givenEvent({
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_2',
          customer: 'cus_1',
          billing_reason: 'subscription_cycle',
          amount_paid: 9999,
          currency: 'usd',
        },
      },
    })

    await POST(webhookRequest())

    expect(posthog.capture).not.toHaveBeenCalled()
  })
})

describe('subscription_upgraded and subscription_downgraded', () => {
  function givenPlanChange(fromPriceId: string, toPriceId: string) {
    prismaMock.subscription.findUnique.mockResolvedValue({
      planId: fromPriceId,
      organizationId: ORG.id,
      organization: { name: ORG.name },
    })
    stripeMock.subscriptions.retrieve.mockResolvedValue(stripeSubscription(toPriceId))
    givenEvent({
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1' }, previous_attributes: {} },
    })
  }

  it('captures an upgrade with both plan names and the organization group', async () => {
    givenPlanChange(PRICE.STARTER, PRICE.AGENCY)

    await POST(webhookRequest())

    expect(capturedEvent()).toEqual({
      event: 'subscription_upgraded',
      distinctId: 'organization:org-1',
      properties: {
        from_plan: 'Starter',
        to_plan: 'Agency',
        stripe_price_id: PRICE.AGENCY,
        interval: 'month',
      },
      groups: { organization: ORG.id },
    })
  })

  it('captures a downgrade when the tier drops', async () => {
    givenPlanChange(PRICE.AGENCY, PRICE.STARTER)

    await POST(webhookRequest())

    const captured = capturedEvent()
    expect(captured.event).toBe('subscription_downgraded')
    expect(captured.properties).toMatchObject({ from_plan: 'Agency', to_plan: 'Starter' })
  })

  it('captures nothing when the plan did not change', async () => {
    // Stripe emits subscription.updated for payment-method changes and period
    // rollovers too; those are not plan movements.
    givenPlanChange(PRICE.TEAM, PRICE.TEAM)

    await POST(webhookRequest())

    expect(posthog.capture).not.toHaveBeenCalled()
  })
})

describe('subscription_canceled', () => {
  it('captures the plan that ended without rewriting the group plan', async () => {
    prismaMock.subscription.update.mockResolvedValue({
      organizationId: ORG.id,
      planId: PRICE.TEAM,
    })
    givenEvent({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'canceled',
          current_period_end: 1_702_592_000,
          items: { data: [{ price: { id: PRICE.TEAM } }] },
        },
      },
    })

    await POST(webhookRequest())

    expect(capturedEvent()).toEqual({
      event: 'subscription_canceled',
      distinctId: 'organization:org-1',
      properties: { plan: 'Team', stripe_price_id: PRICE.TEAM, status: 'canceled' },
      groups: { organization: ORG.id },
    })
    // The organization no longer holds that plan, so its group record must
    // not be re-stamped with it.
    expect(posthog.groupIdentify).not.toHaveBeenCalled()
  })
})

describe('payment_failed', () => {
  it('captures a failed invoice against the right organization', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({ id: ORG.id })
    givenEvent({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_3',
          customer: 'cus_1',
          amount_due: 9999,
          currency: 'usd',
          attempt_count: 2,
          billing_reason: 'subscription_cycle',
        },
      },
    })

    const response = await POST(webhookRequest())

    expect(response.status).toBe(200)
    expect(capturedEvent()).toEqual({
      event: 'payment_failed',
      distinctId: 'organization:org-1',
      properties: {
        amount_due: 9999,
        currency: 'usd',
        attempt_count: 2,
        billing_reason: 'subscription_cycle',
      },
      groups: { organization: ORG.id },
    })
  })

  it('still reports the failure when the customer maps to no organization', async () => {
    // Losing the event entirely would understate involuntary churn; an
    // unresolved customer is better than silence.
    prismaMock.organization.findUnique.mockResolvedValue(null)
    givenEvent({
      type: 'invoice.payment_failed',
      data: {
        object: { id: 'in_4', customer: 'cus_unknown', amount_due: 100, currency: 'usd' },
      },
    })

    await POST(webhookRequest())

    const captured = capturedEvent()
    expect(captured.distinctId).toBe('stripe_customer:cus_unknown')
    expect(captured.groups).toBeUndefined()
  })
})

describe('flush guarantees', () => {
  // POST awaits flushAnalytics() in a finally block, so every assertion made
  // after `await POST(...)` is by construction an assertion that the flush
  // completed before the response was handed back.

  it('flushes before returning a successful response', async () => {
    givenEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          customer: 'cus_1',
          subscription: 'sub_1',
          mode: 'subscription',
          payment_status: 'paid',
          amount_total: 9999,
          currency: 'usd',
          metadata: { organizationId: ORG.id, userId: 'user-1' },
        },
      },
    })

    const response = await POST(webhookRequest())

    expect(response.status).toBe(200)
    expect(posthog.flush).toHaveBeenCalledTimes(1)
  })

  it('flushes on the early 500 bail-out that asks Stripe to retry', async () => {
    // invoice.paid returns 500 when it cannot resolve the organization, so
    // Stripe retries. Without the finally wrapper this return would skip the
    // drain entirely.
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [stripeSubscription(PRICE.TEAM, { metadata: {} })],
    })
    prismaMock.organization.findUnique.mockResolvedValue(null)
    prismaMock.subscription.findUnique.mockResolvedValue(null)
    givenEvent({
      type: 'invoice.paid',
      data: {
        object: { id: 'in_5', customer: 'cus_1', billing_reason: 'subscription_create' },
      },
    })

    const response = await POST(webhookRequest())

    expect(response.status).toBe(500)
    expect(posthog.flush).toHaveBeenCalledTimes(1)
  })

  it('flushes when the handler throws, before the error propagates', async () => {
    stripeMock.subscriptions.retrieve.mockRejectedValue(new Error('stripe is down'))
    givenEvent({
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1' }, previous_attributes: {} },
    })

    await expect(POST(webhookRequest())).rejects.toThrow('stripe is down')
    expect(posthog.flush).toHaveBeenCalledTimes(1)
  })

  it('flushes even when the signature is rejected and nothing was captured', async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('invalid signature')
    })

    const response = await POST(webhookRequest())

    expect(response.status).toBe(400)
    expect(posthog.capture).not.toHaveBeenCalled()
    expect(posthog.flush).toHaveBeenCalledTimes(1)
  })
})

describe('analytics failure isolation', () => {
  it('still returns 200 and still writes to the database when capture throws', async () => {
    // PostHog being down must not make Stripe retry an event we already
    // processed -- that would double-apply the business effects.
    posthog.capture.mockImplementation(() => {
      throw new Error('posthog is down')
    })
    givenEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          customer: 'cus_1',
          subscription: 'sub_1',
          mode: 'subscription',
          payment_status: 'paid',
          amount_total: 9999,
          currency: 'usd',
          metadata: { organizationId: ORG.id, userId: 'user-1' },
        },
      },
    })

    const response = await POST(webhookRequest())

    expect(response.status).toBe(200)
    expect(prismaMock.subscription.upsert).toHaveBeenCalledTimes(1)
  })
})

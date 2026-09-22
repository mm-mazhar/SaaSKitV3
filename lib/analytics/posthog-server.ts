// lib/analytics/posthog-server.ts

import { after } from 'next/server'
import { PostHog } from 'posthog-node'
import {
  ORGANIZATION_GROUP_TYPE,
  type AnalyticsEvent,
  type OrganizationGroupProperties,
} from './events'

const POSTHOG_KEY = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST =
  process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let client: PostHog | null = null
let clientResolved = false

/**
 * Lazily-built shared posthog-node client, or null when no key is configured.
 *
 * Returning null (rather than constructing a client with an empty key) is what
 * makes analytics genuinely optional: a fork of this kit, a preview deploy, or
 * CI can run with no PostHog project at all and every capture below turns into
 * a no-op instead of an error or a stream of rejected HTTP requests.
 */
export function getPostHogServerClient(): PostHog | null {
  if (clientResolved) return client
  clientResolved = true

  if (!POSTHOG_KEY) return client

  client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    // This app runs on Vercel serverless functions, not a long-lived server.
    // posthog-node's default batching (flushAt 20 / flushInterval 10s) assumes
    // a process that stays alive long enough to drain the queue; a function
    // that returns after one event would hold that event in memory until the
    // instance is frozen or recycled, and the event is simply lost. Sending
    // each event as it is enqueued removes that window, and flushAnalytics()
    // below closes the remainder.
    flushAt: 1,
    flushInterval: 0,
  })

  return client
}

/**
 * Distinct id for events no human performed -- Stripe webhooks, cron jobs.
 *
 * PostHog requires a distinct id on every event, and reusing the bare
 * organization id would silently merge an account-level actor into the person
 * namespace, where it would be indistinguishable from a real user. The prefix
 * keeps machine-originated activity obvious in the UI while still binding the
 * event to the right organization group.
 */
export function organizationDistinctId(organizationId: string): string {
  return `organization:${organizationId}`
}

/**
 * Drops absent keys rather than sending them as null.
 *
 * PostHog group properties are last-write-wins, so sending `plan: null` from a
 * code path that simply does not know the plan would erase a plan another
 * event had already set correctly.
 */
function definedGroupProperties(
  properties: OrganizationGroupProperties
): Record<string, string> {
  const defined: Record<string, string> = {}
  if (properties.name) defined.name = properties.name
  if (properties.plan) defined.plan = properties.plan
  return defined
}

type CaptureArgs = {
  event: AnalyticsEvent
  /**
   * Who the event belongs to. Prefer the Supabase user id; fall back to the
   * organization id for machine-originated events (Stripe webhooks) where no
   * single user performed the action.
   */
  distinctId: string
  /** Binds the event to a PostHog organization group for tenant-level analysis. */
  organizationId?: string | null
  properties?: Record<string, unknown>
  /**
   * When supplied, also refreshes the organization's group record so plan and
   * name stay current in PostHog without a separate sync job.
   */
  organizationProperties?: OrganizationGroupProperties
}

/**
 * Enqueues a server-side event.
 *
 * Synchronous and non-throwing by design. `capture()` is an in-memory enqueue,
 * so there is nothing here worth awaiting on a user-facing request path -- and
 * analytics must never be able to fail the business operation that triggered
 * it, so every error is swallowed to a warning. Pair with flushAnalytics()
 * before the serverless function returns.
 */
export function captureServer({
  event,
  distinctId,
  organizationId,
  properties,
  organizationProperties,
}: CaptureArgs): void {
  const posthog = getPostHogServerClient()
  if (!posthog) return

  try {
    if (organizationId && organizationProperties) {
      posthog.groupIdentify({
        groupType: ORGANIZATION_GROUP_TYPE,
        groupKey: organizationId,
        properties: definedGroupProperties(organizationProperties),
      })
    }

    posthog.capture({
      distinctId,
      event,
      properties,
      ...(organizationId
        ? { groups: { [ORGANIZATION_GROUP_TYPE]: organizationId } }
        : {}),
    })
  } catch (error) {
    console.warn('[analytics] capture failed', { event, error })
  }
}

/**
 * Drains queued events before the current serverless invocation returns.
 *
 * Uses flush(), not shutdown(): the client above is a module-level singleton
 * that a warm Vercel instance reuses across invocations, and shutdown() closes
 * it for good -- every later invocation on that instance would silently drop
 * its events. flush() drains without destroying the client.
 *
 * Never throws: a PostHog outage must not turn a successful webhook into a
 * 500 that Stripe then retries.
 */
export async function flushAnalytics(): Promise<void> {
  const posthog = getPostHogServerClient()
  if (!posthog) return

  try {
    await posthog.flush()
  } catch (error) {
    console.warn('[analytics] flush failed', { error })
  }
}

/**
 * Drains queued events without making the caller wait for PostHog.
 *
 * For user-facing paths -- a sign-in redirect, an oRPC mutation, a server
 * action -- where awaiting a round trip to PostHog would put an analytics
 * vendor on the critical path of a product interaction. `after()` runs the
 * flush once the response has been sent but while Vercel still holds the
 * invocation open, which is the guarantee a serverless function needs.
 *
 * Falls back to an inline flush outside a Next.js request scope (a service
 * called directly, a unit test), where `after()` has nothing to defer to and
 * throws. Webhooks deliberately do not use this -- see the Stripe route.
 */
export async function flushAnalyticsAfterResponse(): Promise<void> {
  try {
    after(flushAnalytics)
  } catch {
    await flushAnalytics()
  }
}

/**
 * Test seam: drops the memoised client so a suite can swap the mocked
 * constructor or the environment between cases. Not used in application code.
 */
export function resetPostHogServerClientForTests(): void {
  client = null
  clientResolved = false
}

// tests/analytics/posthog-server.test.ts
// Covers the shared server-side capture layer: serverless-safe configuration,
// organization group binding, and the guarantee that analytics can never
// throw into the code that called it.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANALYTICS_EVENTS, ORGANIZATION_GROUP_TYPE } from '@/lib/analytics/events'

const posthog = vi.hoisted(() => {
  // Set before any import evaluates: lib/analytics/posthog-server reads its
  // key at module scope, and a missing key correctly disables the client.
  process.env.POSTHOG_KEY = 'phc_test_key'
  process.env.POSTHOG_HOST = 'https://us.i.posthog.com'

  return {
    capture: vi.fn(),
    groupIdentify: vi.fn(),
    flush: vi.fn(async () => {}),
    shutdown: vi.fn(async () => {}),
  }
})

const PostHogConstructor = vi.hoisted(() => vi.fn())

vi.mock('posthog-node', () => ({
  PostHog: class {
    constructor(...args: unknown[]) {
      PostHogConstructor(...args)
      return posthog
    }
  },
}))

import {
  captureServer,
  flushAnalytics,
  getPostHogServerClient,
  organizationDistinctId,
  resetPostHogServerClientForTests,
} from '@/lib/analytics/posthog-server'

describe('server analytics client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPostHogServerClientForTests()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('configures the client for serverless, not for a long-running process', () => {
    // #given a Vercel function that is frozen the moment it responds
    // #when the shared client is built
    getPostHogServerClient()

    // #then events are sent as they are enqueued rather than batched in
    // memory where a freeze would lose them
    expect(PostHogConstructor).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({ flushAt: 1, flushInterval: 0, host: 'https://us.i.posthog.com' })
    )
  })

  it('builds the client once and reuses it across calls', () => {
    getPostHogServerClient()
    getPostHogServerClient()
    getPostHogServerClient()

    expect(PostHogConstructor).toHaveBeenCalledTimes(1)
  })

  it('binds an org-scoped event to the organization group', () => {
    captureServer({
      event: ANALYTICS_EVENTS.ORGANIZATION_CREATED,
      distinctId: 'user-1',
      organizationId: 'org-1',
      properties: { is_primary: true },
    })

    expect(posthog.capture).toHaveBeenCalledTimes(1)
    expect(posthog.capture).toHaveBeenCalledWith({
      distinctId: 'user-1',
      event: 'organization_created',
      properties: { is_primary: true },
      groups: { [ORGANIZATION_GROUP_TYPE]: 'org-1' },
    })
  })

  it('omits groups entirely for an event with no organization', () => {
    // A signup happens before any organization exists. Sending
    // `groups: { organization: undefined }` would create a junk group.
    captureServer({
      event: ANALYTICS_EVENTS.USER_SIGNED_UP,
      distinctId: 'user-1',
      properties: { method: 'magic_link' },
    })

    expect(posthog.capture).toHaveBeenCalledWith(
      expect.not.objectContaining({ groups: expect.anything() })
    )
  })

  it('refreshes the group record when organization properties are supplied', () => {
    captureServer({
      event: ANALYTICS_EVENTS.SUBSCRIPTION_CREATED,
      distinctId: organizationDistinctId('org-1'),
      organizationId: 'org-1',
      organizationProperties: { name: 'Acme', plan: 'Team' },
    })

    expect(posthog.groupIdentify).toHaveBeenCalledWith({
      groupType: ORGANIZATION_GROUP_TYPE,
      groupKey: 'org-1',
      properties: { name: 'Acme', plan: 'Team' },
    })
  })

  it('leaves the group record alone when no organization properties are supplied', () => {
    captureServer({
      event: ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED,
      distinctId: organizationDistinctId('org-1'),
      organizationId: 'org-1',
      properties: { plan: 'Team' },
    })

    expect(posthog.groupIdentify).not.toHaveBeenCalled()
  })

  it('marks machine-originated events so they are not mistaken for people', () => {
    expect(organizationDistinctId('org-1')).toBe('organization:org-1')
  })

  it('swallows a capture failure instead of propagating it to the caller', () => {
    // The whole point: a PostHog outage must never fail a signup, an invite
    // or a webhook.
    posthog.capture.mockImplementationOnce(() => {
      throw new Error('posthog is down')
    })

    expect(() =>
      captureServer({
        event: ANALYTICS_EVENTS.MEMBER_JOINED,
        distinctId: 'user-1',
        organizationId: 'org-1',
      })
    ).not.toThrow()
  })

  it('drains with flush(), never shutdown(), so a warm instance stays usable', () => {
    // shutdown() closes the singleton for good; every later invocation on the
    // same warm Vercel instance would silently drop its events.
    return flushAnalytics().then(() => {
      expect(posthog.flush).toHaveBeenCalledTimes(1)
      expect(posthog.shutdown).not.toHaveBeenCalled()
    })
  })

  it('swallows a flush failure so a webhook is not turned into a retryable 500', async () => {
    posthog.flush.mockRejectedValueOnce(new Error('network unreachable'))

    await expect(flushAnalytics()).resolves.toBeUndefined()
  })
})

describe('server analytics client without a configured key', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('is an inert no-op so the kit runs with no PostHog project at all', async () => {
    vi.stubEnv('POSTHOG_KEY', '')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')
    vi.resetModules()
    vi.clearAllMocks()

    const analytics = await import('@/lib/analytics/posthog-server')

    expect(analytics.getPostHogServerClient()).toBeNull()

    analytics.captureServer({
      event: ANALYTICS_EVENTS.USER_SIGNED_UP,
      distinctId: 'user-1',
    })
    await analytics.flushAnalytics()

    expect(PostHogConstructor).not.toHaveBeenCalled()
    expect(posthog.capture).not.toHaveBeenCalled()
  })
})

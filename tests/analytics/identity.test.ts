// tests/analytics/identity.test.ts
// Covers the identify()/reset() rules the browser provider applies to every
// Supabase auth state change.

import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyAuthStateToAnalytics,
  resetIdentityStateForTests,
  type AnalyticsIdentityClient,
} from '@/lib/analytics/identity'

function makeClient() {
  return {
    identify: vi.fn<(distinctId: string, properties?: Record<string, unknown>) => void>(),
    reset: vi.fn<() => void>(),
  } satisfies AnalyticsIdentityClient
}

function makeSession(id: string, email: string): Session {
  return { user: { id, email } } as unknown as Session
}

describe('applyAuthStateToAnalytics', () => {
  beforeEach(() => {
    resetIdentityStateForTests()
  })

  it('identifies with the Supabase user id and email when a session starts', () => {
    // #given a signed-out visitor #when a session appears
    const client = makeClient()

    const outcome = applyAuthStateToAnalytics(
      client,
      'SIGNED_IN' as AuthChangeEvent,
      makeSession('user-123', 'maz@example.com')
    )

    // #then PostHog is told exactly who this is
    expect(outcome).toBe('identified')
    expect(client.identify).toHaveBeenCalledTimes(1)
    expect(client.identify).toHaveBeenCalledWith('user-123', { email: 'maz@example.com' })
  })

  it('identifies on a session restored at page load, not only on explicit sign-in', () => {
    const client = makeClient()

    applyAuthStateToAnalytics(
      client,
      'INITIAL_SESSION' as AuthChangeEvent,
      makeSession('user-123', 'maz@example.com')
    )

    expect(client.identify).toHaveBeenCalledWith('user-123', { email: 'maz@example.com' })
  })

  it('identifies once per user despite repeated token refreshes', () => {
    // Supabase re-fires this listener on every token refresh. Re-identifying
    // each time would bill an event roughly hourly per open tab.
    const client = makeClient()
    const session = makeSession('user-123', 'maz@example.com')

    applyAuthStateToAnalytics(client, 'SIGNED_IN' as AuthChangeEvent, session)
    const second = applyAuthStateToAnalytics(client, 'TOKEN_REFRESHED' as AuthChangeEvent, session)
    const third = applyAuthStateToAnalytics(client, 'USER_UPDATED' as AuthChangeEvent, session)

    expect(client.identify).toHaveBeenCalledTimes(1)
    expect(second).toBe('noop')
    expect(third).toBe('noop')
  })

  it('resets on sign out', () => {
    const client = makeClient()
    applyAuthStateToAnalytics(
      client,
      'SIGNED_IN' as AuthChangeEvent,
      makeSession('user-123', 'maz@example.com')
    )

    const outcome = applyAuthStateToAnalytics(client, 'SIGNED_OUT' as AuthChangeEvent, null)

    expect(outcome).toBe('reset')
    expect(client.reset).toHaveBeenCalledTimes(1)
  })

  it('does not reset a visitor who was never identified', () => {
    // reset() rotates the anonymous id. Calling it on a visitor who only ever
    // browsed marketing pages would split one person into two and break the
    // pre-signup funnel.
    const client = makeClient()

    const outcome = applyAuthStateToAnalytics(client, 'SIGNED_OUT' as AuthChangeEvent, null)

    expect(outcome).toBe('noop')
    expect(client.reset).not.toHaveBeenCalled()
  })

  it('identifies the new user after a sign out and a different sign in', () => {
    const client = makeClient()

    applyAuthStateToAnalytics(
      client,
      'SIGNED_IN' as AuthChangeEvent,
      makeSession('user-123', 'maz@example.com')
    )
    applyAuthStateToAnalytics(client, 'SIGNED_OUT' as AuthChangeEvent, null)
    applyAuthStateToAnalytics(
      client,
      'SIGNED_IN' as AuthChangeEvent,
      makeSession('user-456', 'other@example.com')
    )

    expect(client.identify).toHaveBeenCalledTimes(2)
    expect(client.identify).toHaveBeenLastCalledWith('user-456', { email: 'other@example.com' })
  })
})

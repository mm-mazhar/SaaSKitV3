// lib/analytics/identity.ts

import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

/**
 * The slice of posthog-js this module needs. Keeping it structural lets the
 * identity rules be unit-tested in Node without a browser or the real SDK.
 */
export type AnalyticsIdentityClient = {
  identify: (distinctId: string, properties?: Record<string, unknown>) => void
  reset: () => void
}

export type IdentityOutcome = 'identified' | 'reset' | 'noop'

let identifiedUserId: string | null = null

/**
 * Mirrors a Supabase auth state change onto PostHog's identity.
 *
 * Driven by `supabase.auth.onAuthStateChange` rather than by each sign-in and
 * sign-out call site: that listener is already the single client-side source
 * of truth for the session, so hooking it identifies on every entry path
 * (magic link, OAuth, an existing session restored on load, a session
 * recovered in another tab) and resets on every sign-out -- including the two
 * separate logout buttons -- without any of them knowing analytics exists.
 *
 * Guarding on the user id keeps identify() to once per user: Supabase fires
 * this listener again on every token refresh, and re-identifying on each one
 * would bill an event roughly hourly per open tab for no added information.
 */
export function applyAuthStateToAnalytics(
  client: AnalyticsIdentityClient,
  event: AuthChangeEvent,
  session: Session | null
): IdentityOutcome {
  if (event === 'SIGNED_OUT' || !session?.user) {
    // Nothing identified means nothing to unlink, and calling reset() anyway
    // would rotate the anonymous id of a visitor who was never signed in --
    // breaking the pre-signup funnel by splitting one visitor into two people.
    if (!identifiedUserId) return 'noop'

    identifiedUserId = null
    client.reset()
    return 'reset'
  }

  const { id, email } = session.user
  if (identifiedUserId === id) return 'noop'

  identifiedUserId = id
  client.identify(id, { email })
  return 'identified'
}

/** Test seam: clears the module-level identity guard between cases. */
export function resetIdentityStateForTests(): void {
  identifiedUserId = null
}

// app/providers.tsx

'use client'

import { createClient } from '@/app/lib/supabase/client'
import { applyAuthStateToAnalytics } from '@/lib/analytics/identity'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { Suspense, useEffect, type ReactNode } from 'react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

/**
 * Initialises posthog-js exactly once per browser session.
 *
 * Callable from any effect rather than only the provider's own, because React
 * runs child effects before parent effects -- the pageview tracker below would
 * otherwise fire its first capture against an uninitialised SDK. Returns false
 * when no key is configured, which is how analytics stays entirely optional.
 */
export function ensurePostHogInitialized(): boolean {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return false
  if (initialized) return true

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Pageviews are captured explicitly by PageviewTracker below.
    capture_pageview: false,
    // Session replay is a per-product decision with real privacy and consent
    // implications (it records form fields, customer data, and support
    // sessions). The kit ships it off; turn it on deliberately once the
    // product built on this kit has decided what it is allowed to record.
    disable_session_recording: true,
  })

  initialized = true
  return true
}

/**
 * Captures $pageview on client-side navigation.
 *
 * The App Router navigates through the History API without a document load,
 * so the SDK's load-time pageview only ever fires once per hard navigation.
 * This is deliberately explicit rather than delegated to posthog-js's
 * `capture_pageview: 'history_change'` mode, so pageview behaviour is visible
 * in this repo and cannot change underneath it when the SDK revises its
 * defaults.
 */
function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname || !ensurePostHogInitialized()) return

    const query = searchParams?.toString()
    const url = `${window.location.origin}${pathname}${query ? `?${query}` : ''}`

    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

/**
 * Keeps PostHog's identity in step with the Supabase session.
 *
 * Subscribes to the browser client's own auth listener instead of re-reading
 * the session, so there is exactly one client-side session source and sign-in
 * and sign-out paths need no analytics code of their own.
 */
function IdentityTracker() {
  useEffect(() => {
    if (!ensurePostHogInitialized()) return

    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      applyAuthStateToAnalytics(posthog, event, session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    ensurePostHogInitialized()
  }, [])

  return (
    <>
      {/*
        useSearchParams() opts its whole subtree into client rendering, which
        would deopt every statically rendered marketing page if the tracker
        were not isolated behind its own boundary.
      */}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      <IdentityTracker />
      {children}
    </>
  )
}

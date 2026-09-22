// app/(dashboard)/_components/analytics-organization.tsx

'use client'

import { ensurePostHogInitialized } from '@/app/providers'
import { ORGANIZATION_GROUP_TYPE } from '@/lib/analytics/events'
import posthog from 'posthog-js'
import { useEffect } from 'react'

/**
 * Binds the browser session to the active organization's PostHog group, so
 * client-side events (pageviews, autocapture, anything a product adds later)
 * are attributed to the tenant and not only to the user.
 *
 * Mounted from the dashboard layout, which is the one place that has already
 * resolved which organization is active and what it is paying for -- resolving
 * it again client-side would be a second, divergent source of truth.
 */
export function AnalyticsOrganization({
  organizationId,
  name,
  plan,
}: {
  organizationId: string | null
  name: string | null
  plan: string | null
}) {
  useEffect(() => {
    if (!organizationId || !ensurePostHogInitialized()) return

    const properties: Record<string, string> = {}
    if (name) properties.name = name
    if (plan) properties.plan = plan

    posthog.group(ORGANIZATION_GROUP_TYPE, organizationId, properties)
  }, [organizationId, name, plan])

  return null
}

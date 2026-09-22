// app/actions/cookie-actions.ts
// Server actions that require cookie manipulation (cannot be done via oRPC)

'use server'

import { getCachedUser } from '@/app/lib/supabase/server'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { captureServer, flushAnalyticsAfterResponse } from '@/lib/analytics/posthog-server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Switch the current organization context
 * Sets the current-org-id cookie and redirects to dashboard
 */
export async function switchOrganization(orgId: string) {
  const cookieStore = await cookies()
  const previousOrgId = cookieStore.get('current-org-id')?.value ?? null
  cookieStore.set('current-org-id', orgId)

  // Captured before redirect(): redirect throws a control-flow error, so
  // anything after it in this function never runs.
  if (previousOrgId !== orgId) {
    const {
      data: { user },
    } = await getCachedUser()

    if (user) {
      captureServer({
        event: ANALYTICS_EVENTS.ORGANIZATION_SWITCHED,
        distinctId: user.id,
        organizationId: orgId,
        properties: { from_organization_id: previousOrgId },
      })
      await flushAnalyticsAfterResponse()
    }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

/**
 * Set the current organization without redirecting
 * Use this when you want to handle navigation client-side
 *
 * Deliberately not instrumented as organization_switched: its only caller is
 * the create-organization dialog, which uses it to land the user in the org
 * they just created. Counting that as a switch would report a switch for
 * every organization_created and inflate the metric.
 */
export async function setCurrentOrganization(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set('current-org-id', orgId)
  revalidatePath('/dashboard')
}

/**
 * Switch the current workspace context
 * Sets the current-workspace-id cookie and redirects to dashboard
 */
export async function switchWorkspace(workspaceId: string) {
  const cookieStore = await cookies()
  cookieStore.set('current-workspace-id', workspaceId)
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

/**
 * Set the current workspace without redirecting
 * Use this when you want to handle navigation client-side
 */
export async function setCurrentWorkspace(workspaceId: string) {
  const cookieStore = await cookies()
  cookieStore.set('current-workspace-id', workspaceId)
  revalidatePath('/dashboard')
}
